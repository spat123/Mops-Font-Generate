import { useMemo } from 'react';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { isFontTabId } from '../utils/editorShellStorage';
import type { SessionFontRecord, TabStripPlaceholder } from '../types/editorFonts';

type UseEditorTabBarModelParams = {
  mainTab: string;
  selectedFont: SessionFontRecord | null;
  catalogPreviewSlotsById: Record<string, SessionFontRecord | null | undefined>;
  fonts: SessionFontRecord[];
  closedLibraryFontIds: string[];
  isInitialLoadComplete: boolean;
  tabStripPreviewFromCache: TabStripPlaceholder[];
};

/**
 * Производные данные таббара: видимые шрифты, подписи empty-слотов, sidebar font, placeholders.
 */
export function useEditorTabBarModel({
  mainTab,
  selectedFont,
  catalogPreviewSlotsById,
  fonts,
  closedLibraryFontIds,
  isInitialLoadComplete,
  tabStripPreviewFromCache,
}: UseEditorTabBarModelParams) {
  const sidebarSelectedFont = useMemo(() => {
    if (isFontTabId(mainTab)) {
      const tabFont = fonts.find((font) => font.id === mainTab) || null;
      if (tabFont) {
        return selectedFont?.id === mainTab ? selectedFont : tabFont;
      }
      return selectedFont?.id === mainTab ? selectedFont : null;
    }
    if (mainTab.startsWith(EMPTY_PREFIX)) {
      const slotId = mainTab.slice(EMPTY_PREFIX.length);
      const slotFont = catalogPreviewSlotsById?.[slotId] || null;
      if (!slotFont) return null;
      if (selectedFont?.id && selectedFont.id === slotFont.id) return selectedFont;
      return slotFont;
    }
    return null;
  }, [catalogPreviewSlotsById, fonts, mainTab, selectedFont]);

  const fontTabPlaceholders = useMemo(() => {
    if (fonts.length > 0) return null;
    if (isInitialLoadComplete) return null;
    if (!tabStripPreviewFromCache.length) return null;
    return tabStripPreviewFromCache;
  }, [fonts.length, isInitialLoadComplete, tabStripPreviewFromCache]);

  const emptySlotLabelsById = useMemo(() => {
    const out: Record<string, string> = {};
    Object.entries(catalogPreviewSlotsById || {}).forEach(([slotId, font]) => {
      const label = font?.displayName || font?.name || '';
      if (label) out[slotId] = String(label);
    });
    return out;
  }, [catalogPreviewSlotsById]);

  const fontsVisibleInTabBar = useMemo(
    () => fonts.filter((font) => !closedLibraryFontIds.includes(font.id)),
    [fonts, closedLibraryFontIds],
  );

  return {
    sidebarSelectedFont,
    fontTabPlaceholders,
    emptySlotLabelsById,
    fontsVisibleInTabBar,
  };
}
