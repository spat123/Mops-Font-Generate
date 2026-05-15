import { useEffect, useRef } from 'react';
import {
  FONTSOURCE_PREWARM_CONCURRENCY,
  FONTSOURCE_PREWARM_DELAY_MS,
  FONTSOURCE_PREWARM_LIMIT,
} from '../constants/fontsLibraryScreen';
import { preloadFontsourcePreviewSlugs } from '../utils/fontsourcePreviewRuntimeCache';

/**
 * Фоновый prewarm превью Fontsource (даже до открытия вкладки Fontsource).
 * - запускается один раз после восстановления shell редактора
 * - уважает save-data / 2g
 * - использует requestIdleCallback, иначе fallback на setTimeout
 */
export function useFontsourcePreviewPrewarm({ hasRestoredEditorMainTab, enabled = true } = {}) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (!hasRestoredEditorMainTab) return undefined;
    if (startedRef.current) return undefined;
    startedRef.current = true;

    let cancelled = false;
    let idleHandle = null;
    let timeoutHandle = null;

    const runPrewarm = async () => {
      if (cancelled) return;

      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const saveData = Boolean(connection?.saveData);
      const effectiveType = String(connection?.effectiveType || '').toLowerCase();
      if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
        return;
      }

      try {
        const catalogRes = await fetch('/api/fontsource-catalog');
        if (!catalogRes.ok) return;
        const catalogData = await catalogRes.json();
        const slugs = (Array.isArray(catalogData?.items) ? catalogData.items : [])
          .map((row) => row?.id || row?.slug)
          .filter(Boolean)
          .slice(0, FONTSOURCE_PREWARM_LIMIT);

        if (slugs.length === 0) return;

        await preloadFontsourcePreviewSlugs(slugs, {
          concurrency: FONTSOURCE_PREWARM_CONCURRENCY,
          weight: 400,
          style: 'normal',
        });
      } catch {
        // Игнорируем: prewarm необязателен
      }
    };

    const start = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(() => {
          runPrewarm();
        }, { timeout: 4000 });
      } else {
        timeoutHandle = window.setTimeout(() => {
          runPrewarm();
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

