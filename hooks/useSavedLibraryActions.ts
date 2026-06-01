import { useCallback, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import { toast } from '../utils/appNotify';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import {
  notifyFontAlreadyInLibrary,
  notifyFontMovedToLibrary,
} from '../components/ui/FontLibraryToastNotifications';
import {
  buildDuplicatedLibraryFontEntry,
  countSameCatalogFontInLibrary,
  getFontIdsToRemoveWhenLibraryDeleted,
  stampLibraryFontAddedNow,
} from '../utils/fontLibraryUtils';
import { readLibraryFontDragData } from '../utils/libraryDragData';
import { makeSavedLibraryTabId, readSavedLibraryId } from '../utils/savedLibraryTabIds';
import { useLibraryEntryPrefetch } from './useLibraryEntryPrefetch';
import type { LibraryCreateDialogRequest } from '../types/libraryCreateDialog';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';

type LibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

type UseSavedLibraryActionsParams = {
  fontLibraries: SavedLibraryRecord[];
  createFontLibrary: (draft: { name?: string; fonts?: LibraryFontEntry[] }) => SavedLibraryRecord | null;
  updateFontLibrary: (libraryId: string, draft: Partial<SavedLibraryRecord>) => void;
  deleteFontLibrary: (libraryId: string) => void;
  reorderLibraryFonts: (libraryId: string, draggedFontId: string, targetFontId: string) => void;
  fonts: SessionFontRecord[];
  mainTab: string;
  emptySlotIds: string[];
  closedLibraryFontIds: string[];
  selectedFont: SessionFontRecord | null;
  setFontsLibraryTab: Dispatch<SetStateAction<string>>;
  setMainTab: Dispatch<SetStateAction<string>>;
  setSelectedFont: Dispatch<SetStateAction<SessionFontRecord | null>>;
  setClosedLibraryFontIds: Dispatch<SetStateAction<string[]>>;
  removeFontsByIds: (ids: string[]) => void;
  safeSelectFont: (font: SessionFontRecord) => void;
  assertCanCreateNewLibrary: () => boolean;
  setLibraryCreateDialogRequest: Dispatch<SetStateAction<LibraryCreateDialogRequest | null>>;
};

/**
 * CRUD сохранённых библиотек, drag на вкладки, перенос записей между библиотеками.
 */
export function useSavedLibraryActions({
  fontLibraries,
  createFontLibrary,
  updateFontLibrary,
  deleteFontLibrary,
  reorderLibraryFonts,
  fonts,
  mainTab,
  emptySlotIds,
  closedLibraryFontIds,
  selectedFont,
  setFontsLibraryTab,
  setMainTab,
  setSelectedFont,
  setClosedLibraryFontIds,
  removeFontsByIds,
  safeSelectFont,
  assertCanCreateNewLibrary,
  setLibraryCreateDialogRequest,
}: UseSavedLibraryActionsParams) {
  const [libraryDropTargetTabId, setLibraryDropTargetTabId] = useState<string | null>(null);
  const prefetchLibraryEntry = useLibraryEntryPrefetch();

  const handleUpdateSavedLibrary = useCallback(
    (libraryId: string, draft: Partial<SavedLibraryRecord>) => updateFontLibrary(libraryId, draft),
    [updateFontLibrary],
  );

  const handleCreateSavedLibrary = useCallback(
    (draft: { name?: string; fonts?: LibraryFontEntry[] }) => {
      if (!assertCanCreateNewLibrary()) return null;
      const created = createFontLibrary(draft);
      if (created?.id) {
        setMainTab('library');
        setFontsLibraryTab(makeSavedLibraryTabId(created.id));
      }
      return created;
    },
    [assertCanCreateNewLibrary, createFontLibrary, setFontsLibraryTab, setMainTab],
  );

  const handleDeleteSavedLibrary = useCallback(
    (libraryId: string) => {
      const deletedLibrary = fontLibraries.find((library) => library.id === libraryId) || null;
      const remainingLibraries = fontLibraries.filter((library) => library.id !== libraryId);
      const idsToRemove = getFontIdsToRemoveWhenLibraryDeleted(fonts, deletedLibrary, remainingLibraries);

      deleteFontLibrary(libraryId);
      setFontsLibraryTab((prev) => (prev === makeSavedLibraryTabId(libraryId) ? 'catalog' : prev));

      if (idsToRemove.length === 0) return;

      const removedSet = new Set(idsToRemove.map((id) => String(id)));
      const remainingAfter = fonts.filter((font) => !removedSet.has(String(font.id)));

      removeFontsByIds(idsToRemove);
      setClosedLibraryFontIds((prev) => prev.filter((id) => !removedSet.has(String(id))));

      if (removedSet.has(String(mainTab))) {
        const nextVisible =
          remainingAfter.find((font) => !closedLibraryFontIds.includes(font.id)) || null;
        if (nextVisible) {
          setMainTab(nextVisible.id);
          if (String(selectedFont?.id) !== String(nextVisible.id)) {
            safeSelectFont(nextVisible);
          }
        } else if (emptySlotIds.length > 0) {
          setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
          setSelectedFont(null);
        } else {
          setMainTab('library');
          setSelectedFont(null);
        }
      }
    },
    [
      closedLibraryFontIds,
      deleteFontLibrary,
      emptySlotIds,
      fontLibraries,
      fonts,
      mainTab,
      removeFontsByIds,
      safeSelectFont,
      selectedFont,
      setClosedLibraryFontIds,
      setFontsLibraryTab,
      setMainTab,
      setSelectedFont,
    ],
  );

  const handleMoveLibraryFont = useCallback(
    (libraryId: string, draggedFontId: string, targetFontId: string) => {
      reorderLibraryFonts(libraryId, draggedFontId, targetFontId);
    },
    [reorderLibraryFonts],
  );

  const duplicateLibraryFontEntryInLibrary = useCallback(
    (libraryId: string, fontEntry: LibraryFontEntry) => {
      const targetLibrary = fontLibraries.find((library) => library.id === libraryId);
      if (!targetLibrary) return false;
      const duplicate = buildDuplicatedLibraryFontEntry(fontEntry, targetLibrary.fonts || []);
      if (!duplicate) {
        toast.error('Не удалось дублировать запись в библиотеке');
        return false;
      }
      handleUpdateSavedLibrary(libraryId, {
        fonts: [...(targetLibrary.fonts || []), duplicate],
      });
      toast.success(`Добавлена копия «${duplicate.label}»`);
      prefetchLibraryEntry(duplicate);
      return true;
    },
    [fontLibraries, handleUpdateSavedLibrary, prefetchLibraryEntry],
  );

  const addFontEntryToLibrary = useCallback(
    (libraryId: string, fontEntry: LibraryFontEntry) => {
      const entry = stampLibraryFontAddedNow(fontEntry);
      if (!entry) return false;
      const targetLibrary = fontLibraries.find((library) => library.id === libraryId);
      if (!targetLibrary) return false;
      const existingCount = countSameCatalogFontInLibrary(entry, targetLibrary.fonts || []);
      if (existingCount > 0 || targetLibrary.fonts?.some((item) => item.id === entry.id)) {
        return duplicateLibraryFontEntryInLibrary(libraryId, fontEntry);
      }
      handleUpdateSavedLibrary(libraryId, {
        fonts: [...(targetLibrary.fonts || []), entry],
      });
      notifyFontMovedToLibrary(entry.label, targetLibrary.name);
      prefetchLibraryEntry(entry);
      return true;
    },
    [fontLibraries, handleUpdateSavedLibrary, prefetchLibraryEntry],
  );

  const handleLibraryTabDragOver = useCallback((event: DragEvent, tabId: string) => {
    const draggedFontEntry = readLibraryFontDragData(event.dataTransfer);
    if (!draggedFontEntry) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setLibraryDropTargetTabId(tabId);
  }, []);

  const handleLibraryTabDrop = useCallback(
    (event: DragEvent, tabId: string) => {
      const draggedFontEntry = readLibraryFontDragData(event.dataTransfer);
      if (!draggedFontEntry) return;
      event.preventDefault();
      const libraryId = readSavedLibraryId(tabId);
      if (libraryId) {
        addFontEntryToLibrary(libraryId, draggedFontEntry);
        setFontsLibraryTab(tabId);
      }
      setLibraryDropTargetTabId(null);
    },
    [addFontEntryToLibrary, setFontsLibraryTab],
  );

  /** Добавить шрифт в библиотеку, не снимая его с других библиотек (меню редактора / каталог). */
  const moveFontEntryToLibrary = useCallback(
    (libraryId: string, fontEntry: LibraryFontEntry) => addFontEntryToLibrary(libraryId, fontEntry),
    [addFontEntryToLibrary],
  );

  const requestCreateLibraryWithFonts = useCallback(
    (selectedFonts: LibraryFontEntry[]) => {
      if (!assertCanCreateNewLibrary()) return;
      setLibraryCreateDialogRequest({
        requestId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `library-dialog:${Date.now()}`,
        mode: 'create',
        selectedFonts: (Array.isArray(selectedFonts) ? selectedFonts : []).filter(Boolean),
      });
    },
    [assertCanCreateNewLibrary, setLibraryCreateDialogRequest],
  );

  const openSavedLibrary = useCallback(
    (libraryId: string) => {
      setMainTab('library');
      setFontsLibraryTab(makeSavedLibraryTabId(libraryId));
    },
    [setFontsLibraryTab, setMainTab],
  );

  return {
    libraryDropTargetTabId,
    setLibraryDropTargetTabId,
    handleCreateSavedLibrary,
    handleUpdateSavedLibrary,
    handleDeleteSavedLibrary,
    handleMoveLibraryFont,
    addFontEntryToLibrary,
    duplicateLibraryFontEntryInLibrary,
    handleLibraryTabDragOver,
    handleLibraryTabDrop,
    moveFontEntryToLibrary,
    requestCreateLibraryWithFonts,
    openSavedLibrary,
  };
}
