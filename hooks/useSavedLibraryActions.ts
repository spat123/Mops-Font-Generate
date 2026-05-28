import { useCallback, useState, type Dispatch, type DragEvent, type SetStateAction } from 'react';
import { toast } from '../utils/appNotify';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import {
  notifyFontAlreadyInLibrary,
  notifyFontMovedToLibrary,
} from '../components/ui/FontLibraryToastNotifications';
import { getFontIdsToRemoveWhenLibraryDeleted, stampLibraryFontAddedNow } from '../utils/fontLibraryUtils';
import { readLibraryFontDragData } from '../utils/libraryDragData';
import { makeSavedLibraryTabId, readSavedLibraryId } from '../utils/savedLibraryTabIds';
import {
  createSavedLibraryFontEntryMatcher,
  findCanonicalLibraryFontEntry,
} from '../utils/savedLibraryFontEntryMatch';
import { useLibraryEntryPrefetch } from './useLibraryEntryPrefetch';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';

type LibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

type CreateLibrarySeedRequest = {
  requestId: string;
  selectedFonts: LibraryFontEntry[];
};

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
  setCreateLibrarySeedRequest: Dispatch<SetStateAction<CreateLibrarySeedRequest | null>>;
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
  setCreateLibrarySeedRequest,
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

  const addFontEntryToLibrary = useCallback(
    (libraryId: string, fontEntry: LibraryFontEntry) => {
      const entry = stampLibraryFontAddedNow(fontEntry);
      if (!entry) return false;
      const targetLibrary = fontLibraries.find((library) => library.id === libraryId);
      if (!targetLibrary) return false;
      if (targetLibrary.fonts?.some((item) => item.id === entry.id)) {
        notifyFontAlreadyInLibrary(entry.label, targetLibrary.name);
        return false;
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

  const moveFontEntryToLibrary = useCallback(
    (libraryId: string, fontEntry: LibraryFontEntry) => {
      const matcher = createSavedLibraryFontEntryMatcher(fontEntry);
      if (!matcher) return;
      const { entry, matchesEntry } = matcher;

      const targetLibrary = fontLibraries.find((library) => library.id === libraryId);
      if (!targetLibrary) return;

      const currentlyIn = fontLibraries.filter(
        (library) => Array.isArray(library.fonts) && library.fonts.some(matchesEntry),
      );
      const canonicalEntry = findCanonicalLibraryFontEntry(fontLibraries, matchesEntry) || entry;
      const movedEntry = stampLibraryFontAddedNow(canonicalEntry) || canonicalEntry;

      if (currentlyIn.length === 1 && currentlyIn[0].id === targetLibrary.id) {
        toast.info(`Шрифт «${canonicalEntry.label}» уже в библиотеке «${targetLibrary.name}»`);
        return;
      }

      fontLibraries.forEach((library) => {
        const fontsWithoutEntry = (Array.isArray(library.fonts) ? library.fonts : []).filter(
          (item) => !matchesEntry(item),
        );
        const nextFonts =
          library.id === targetLibrary.id ? [...fontsWithoutEntry, movedEntry] : fontsWithoutEntry;
        const hasChanged =
          nextFonts.length !== (library.fonts?.length || 0) ||
          nextFonts.some((item, index) => item.id !== (library.fonts?.[index]?.id || ''));
        if (hasChanged) {
          handleUpdateSavedLibrary(library.id, { fonts: nextFonts });
        }
      });

      toast.success(`Перенесен в «${targetLibrary.name}»`);
    },
    [fontLibraries, handleUpdateSavedLibrary],
  );

  const requestCreateLibraryWithFonts = useCallback(
    (selectedFonts: LibraryFontEntry[]) => {
      if (!assertCanCreateNewLibrary()) return;
      setMainTab('library');
      setCreateLibrarySeedRequest({
        requestId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `library-seed:${Date.now()}`,
        selectedFonts: (Array.isArray(selectedFonts) ? selectedFonts : []).filter(Boolean),
      });
    },
    [assertCanCreateNewLibrary, setCreateLibrarySeedRequest, setMainTab],
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
    handleLibraryTabDragOver,
    handleLibraryTabDrop,
    moveFontEntryToLibrary,
    requestCreateLibraryWithFonts,
    openSavedLibrary,
  };
}
