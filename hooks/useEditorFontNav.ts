import { useCallback } from 'react';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import type { SessionFontRecord } from '../types/editorFonts';
import type { Dispatch, SetStateAction } from 'react';

export type EditorFontUploadOptions = {
  noSelect?: boolean;
  silent?: boolean;
  forceDuplicate?: boolean;
};

/** Элемент загрузки: файл с диска, blob из каталога или session-запись. */
export type EditorFontUploadInput =
  | SessionFontRecord
  | ({ file: File | Blob; name: string; source?: string } & Record<string, unknown>);

type UseEditorFontNavParams = {
  handleFontsUploaded: (
    newFonts: EditorFontUploadInput[],
    options?: EditorFontUploadOptions,
  ) => Promise<SessionFontRecord | null | undefined>;
  selectOrAddFontsourceFont: (
    fontFamilyName: string,
    forceVariableFont?: boolean,
    options?: EditorFontUploadOptions,
  ) => Promise<SessionFontRecord | null | undefined>;
  mainTab: string;
  setMainTab: Dispatch<SetStateAction<string>>;
  setEmptySlotIds: Dispatch<SetStateAction<string[]>>;
  setFontsLibraryTab: Dispatch<SetStateAction<string>>;
};

/**
 * Обёртки загрузки шрифта с переходом на вкладку редактора и сбросом empty-slot.
 */
export function useEditorFontNav({
  handleFontsUploaded,
  selectOrAddFontsourceFont,
  mainTab,
  setMainTab,
  setEmptySlotIds,
  setFontsLibraryTab,
}: UseEditorFontNavParams) {
  const handleFontsUploadedWithNav = useCallback(
    async (newFonts: EditorFontUploadInput[], options: EditorFontUploadOptions = {}) => {
      const { noSelect = false } = options;
      const fromEmptySlot = mainTab.startsWith(EMPTY_PREFIX) ? mainTab.slice(EMPTY_PREFIX.length) : null;
      const added = await handleFontsUploaded(newFonts, options);
      const first = Array.isArray(newFonts) && newFonts[0];
      const src =
        first && typeof first === 'object' && 'source' in first
          ? (first as SessionFontRecord).source
          : undefined;
      if (!noSelect && added?.id) {
        if (fromEmptySlot) {
          setEmptySlotIds((ids) => ids.filter((x) => x !== fromEmptySlot));
        }
        setMainTab(added.id);
      }
      if ((src === 'google' || src === 'fontsource') && mainTab === 'library') {
        setFontsLibraryTab('catalog');
      }
      return added || null;
    },
    [handleFontsUploaded, mainTab, setEmptySlotIds, setFontsLibraryTab, setMainTab],
  );

  const selectOrAddFontsourceFontWithNav = useCallback(
    async (fontFamilyName: string, forceVariableFont = false, options: EditorFontUploadOptions = {}) => {
      const { noSelect = false } = options;
      const fromEmptySlot = mainTab.startsWith(EMPTY_PREFIX) ? mainTab.slice(EMPTY_PREFIX.length) : null;
      const added = await selectOrAddFontsourceFont(fontFamilyName, forceVariableFont, options);
      if (!noSelect && added?.id) {
        if (fromEmptySlot) {
          setEmptySlotIds((ids) => ids.filter((x) => x !== fromEmptySlot));
        }
        setMainTab(added.id);
      }
      if (mainTab === 'library') {
        setFontsLibraryTab('catalog');
      }
      return added || null;
    },
    [selectOrAddFontsourceFont, mainTab, setEmptySlotIds, setFontsLibraryTab, setMainTab],
  );

  return { handleFontsUploadedWithNav, selectOrAddFontsourceFontWithNav };
}
