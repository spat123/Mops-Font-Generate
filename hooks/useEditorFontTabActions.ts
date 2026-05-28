import { useCallback } from 'react';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { resolveEditorTabAfterFontClose } from '../utils/editorTabNavigation';
import type { Dispatch, SetStateAction } from 'react';
import type { SessionFontRecord } from '../types/editorFonts';

type UseEditorFontTabActionsParams = {
  fonts: SessionFontRecord[];
  mainTab: string;
  emptySlotIds: string[];
  closedLibraryFontIds: string[];
  selectedFont: SessionFontRecord | null;
  setClosedLibraryFontIds: Dispatch<SetStateAction<string[]>>;
  setMainTab: (tab: string) => void;
  setSelectedFont: (font: SessionFontRecord | null) => void;
  safeSelectFont: (font: SessionFontRecord) => void;
  removeFont: (fontId: string) => void;
  isFontStoredInAnyLibrary: (font: SessionFontRecord | null) => boolean;
};

/**
 * Выбор шрифта, закрытие вкладки, удаление из сессии.
 */
export function useEditorFontTabActions({
  fonts,
  mainTab,
  emptySlotIds,
  closedLibraryFontIds,
  selectedFont,
  setClosedLibraryFontIds,
  setMainTab,
  setSelectedFont,
  safeSelectFont,
  removeFont,
  isFontStoredInAnyLibrary,
}: UseEditorFontTabActionsParams) {
  const pickFont = useCallback(
    (font: SessionFontRecord) => {
      setClosedLibraryFontIds((prev) => prev.filter((id) => id !== font.id));
      safeSelectFont(font);
      setMainTab(font.id);
    },
    [safeSelectFont, setClosedLibraryFontIds, setMainTab],
  );

  const closeFontTab = useCallback(
    (fontId: string) => {
      const targetFont = fonts.find((font) => font.id === fontId) || null;
      const isStoredInLibrary = isFontStoredInAnyLibrary(targetFont);

      if (isStoredInLibrary) {
        const nextClosed = closedLibraryFontIds.includes(fontId)
          ? closedLibraryFontIds
          : [...closedLibraryFontIds, fontId];
        setClosedLibraryFontIds(nextClosed);
        if (mainTab === fontId) {
          const next = resolveEditorTabAfterFontClose({
            fonts,
            closedLibraryFontIds: nextClosed,
            excludeFontId: fontId,
            emptySlotIds,
          });
          setMainTab(next.mainTab);
          if (next.selectedFont) safeSelectFont(next.selectedFont);
          else setSelectedFont(null);
        }
        return;
      }

      const remainingFonts = fonts.filter((font) => font.id !== fontId);
      if (mainTab === fontId) {
        const next = resolveEditorTabAfterFontClose({
          fonts: remainingFonts,
          closedLibraryFontIds,
          excludeFontId: fontId,
          emptySlotIds,
        });
        setMainTab(next.mainTab);
        if (next.selectedFont) safeSelectFont(next.selectedFont);
        else setSelectedFont(null);
      } else if (selectedFont?.id === fontId) {
        setSelectedFont(remainingFonts[0] || null);
      }
      setClosedLibraryFontIds((prev) => prev.filter((id) => id !== fontId));
      removeFont(fontId);
    },
    [
      closedLibraryFontIds,
      emptySlotIds,
      fonts,
      isFontStoredInAnyLibrary,
      mainTab,
      removeFont,
      safeSelectFont,
      selectedFont,
      setClosedLibraryFontIds,
      setMainTab,
      setSelectedFont,
    ],
  );

  const removeFontFromSession = useCallback(
    (fontId: string) => {
      const remainingFonts = fonts.filter((font) => font.id !== fontId);
      if (mainTab === fontId) {
        const nextVisible = remainingFonts[0] || null;
        if (nextVisible) {
          setMainTab(nextVisible.id);
          safeSelectFont(nextVisible);
          removeFont(fontId);
          return;
        }
        if (emptySlotIds.length > 0) {
          setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
          setSelectedFont(null);
          removeFont(fontId);
          return;
        }
        setMainTab('library');
        setSelectedFont(null);
      } else if (selectedFont?.id === fontId) {
        setSelectedFont(remainingFonts[0] || null);
      }
      removeFont(fontId);
    },
    [emptySlotIds, fonts, mainTab, removeFont, safeSelectFont, selectedFont, setMainTab, setSelectedFont],
  );

  return { pickFont, closeFontTab, removeFontFromSession };
}
