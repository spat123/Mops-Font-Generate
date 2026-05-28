import { useEffect, useRef } from 'react';
import {
  FONTSOURCE_PREWARM_CONCURRENCY,
  FONTSOURCE_PREWARM_DELAY_MS,
  FONTSOURCE_PREWARM_LIMIT,
} from '../constants/fontsLibraryScreen';
import { preloadFontsourcePreviewSlugs } from '../utils/fontsourcePreviewRuntimeCache';

type NetworkInformationLite = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLite;
  mozConnection?: NetworkInformationLite;
  webkitConnection?: NetworkInformationLite;
};

export type UseFontsourcePreviewPrewarmParams = {
  hasRestoredEditorMainTab?: boolean;
  enabled?: boolean;
};

/**
 * Фоновый prewarm превью Fontsource (даже до открытия вкладки Fontsource).
 */
export function useFontsourcePreviewPrewarm({
  hasRestoredEditorMainTab,
  enabled = true,
}: UseFontsourcePreviewPrewarmParams = {}): void {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (!hasRestoredEditorMainTab) return undefined;
    if (startedRef.current) return undefined;
    startedRef.current = true;

    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const runPrewarm = async () => {
      if (cancelled) return;

      const nav = navigator as NavigatorWithConnection;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      const saveData = Boolean(connection?.saveData);
      const effectiveType = String(connection?.effectiveType || '').toLowerCase();
      if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
        return;
      }

      try {
        const catalogRes = await fetch('/api/fontsource-catalog');
        if (!catalogRes.ok) return;
        const catalogData = (await catalogRes.json()) as { items?: Array<{ id?: string; slug?: string }> };
        const slugs = (Array.isArray(catalogData?.items) ? catalogData.items : [])
          .map((row) => row?.id || row?.slug)
          .filter((slug): slug is string => Boolean(slug))
          .slice(0, FONTSOURCE_PREWARM_LIMIT);

        if (slugs.length === 0) return;

        await preloadFontsourcePreviewSlugs(slugs, {
          concurrency: FONTSOURCE_PREWARM_CONCURRENCY,
          weight: 400,
          style: 'normal',
        });
      } catch {
        /* prewarm необязателен */
      }
    };

    const start = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(() => {
          void runPrewarm();
        }, { timeout: 4000 });
      } else {
        timeoutHandle = window.setTimeout(() => {
          void runPrewarm();
        }, FONTSOURCE_PREWARM_DELAY_MS);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [enabled, hasRestoredEditorMainTab]);
}
