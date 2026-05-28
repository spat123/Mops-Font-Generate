import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { SESSION_FONT_TABS_PREVIEW_KEY } from '../utils/editorShellStorage';
import type { SessionFontRecord, TabStripPlaceholder } from '../types/editorFonts';

type UseSessionFontTabsPreviewCacheParams = {
  isInitialLoadComplete: boolean;
  fontsVisibleInTabBar: SessionFontRecord[];
  setTabStripPreviewFromCache?: Dispatch<SetStateAction<TabStripPlaceholder[]>>;
};

/**
 * Держит sessionStorage-снимок вкладок шрифтов для первого кадра после F5.
 */
export function useSessionFontTabsPreviewCache({
  isInitialLoadComplete,
  fontsVisibleInTabBar,
  setTabStripPreviewFromCache,
}: UseSessionFontTabsPreviewCacheParams): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialLoadComplete) return;

    if (!Array.isArray(fontsVisibleInTabBar) || fontsVisibleInTabBar.length === 0) {
      try {
        sessionStorage.removeItem(SESSION_FONT_TABS_PREVIEW_KEY);
      } catch {
        /* ignore */
      }
      setTabStripPreviewFromCache?.([]);
      return;
    }

    try {
      const snapshot = fontsVisibleInTabBar.map((f) => ({
        id: f.id,
        label: (f.displayName || f.name || 'Шрифт').slice(0, 120),
      }));
      sessionStorage.setItem(SESSION_FONT_TABS_PREVIEW_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore */
    }
  }, [fontsVisibleInTabBar, isInitialLoadComplete, setTabStripPreviewFromCache]);
}
