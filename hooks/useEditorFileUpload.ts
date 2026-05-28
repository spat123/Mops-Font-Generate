import { useCallback, type ChangeEvent, type RefObject } from 'react';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';

type UseEditorFileUploadParams = {
  fileUploadTarget: string;
  setFileUploadTarget: (target: string) => void;
  activeSavedLibrary: SavedLibraryRecord | null;
  handleFontsUploadedWithNav: (items: Array<{ file: File; name: string }>) => Promise<SessionFontRecord | null | undefined>;
  handleUpdateSavedLibrary: (libraryId: string, patch: { fonts: SavedLibraryRecord['fonts'] }) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

/**
 * Загрузка шрифтов с диска: в редактор или в активную сохранённую библиотеку.
 */
export function useEditorFileUpload({
  fileUploadTarget,
  setFileUploadTarget,
  activeSavedLibrary,
  handleFontsUploadedWithNav,
  handleUpdateSavedLibrary,
  fileInputRef,
}: UseEditorFileUploadParams) {
  return useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length) return;

      const fileItems = Array.from(files).map((file) => ({
        file,
        name: file.name,
      }));

      if (fileUploadTarget === 'library' && activeSavedLibrary) {
        const addedLibraryFonts: NonNullable<SavedLibraryRecord['fonts']> = [];

        for (const item of fileItems) {
          const added = await handleFontsUploadedWithNav([item]);
          if (added) {
            addedLibraryFonts.push({
              id: `session:${added.id || added.name || added.displayName}`,
              label: added.displayName || added.name || item.name.replace(/\.[^/.]+$/, ''),
              source: added.source || 'local',
              addedAt: Date.now(),
            });
          }
        }

        if (addedLibraryFonts.length > 0) {
          const existingIds = new Set((activeSavedLibrary.fonts || []).map((item) => item.id));
          handleUpdateSavedLibrary(activeSavedLibrary.id, {
            fonts: [
              ...(activeSavedLibrary.fonts || []),
              ...addedLibraryFonts.filter((item) => !existingIds.has(item.id)),
            ],
          });
        }
      } else {
        await handleFontsUploadedWithNav(fileItems);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFileUploadTarget('editor');
    },
    [
      activeSavedLibrary,
      fileInputRef,
      fileUploadTarget,
      handleFontsUploadedWithNav,
      handleUpdateSavedLibrary,
      setFileUploadTarget,
    ],
  );
}
