import { useEffect } from 'react';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { EDITOR_MAIN_TAB_PENDING } from '../utils/editorShellStorage';
import { readSavedLibraryId } from '../utils/savedLibraryTabIds';
import { editorShellDbg } from '../utils/editorShellDebugLog';
import { EMPTY_SELECTION_TOOLBAR_ACTIONS } from '../utils/selectionToolbarActionsState';
import type { SavedLibraryRecord, SessionFontRecord, TabStripPlaceholder } from '../types/editorFonts';
import type { Dispatch, SetStateAction } from 'react';

type UseEditorShellEffectsParams = {
  mainTab: string;
  fontsLibraryTab: string;
  fontLibraries: SavedLibraryRecord[];
  setFontsLibraryTab: (tab: string) => void;
  fonts: SessionFontRecord[];
  isInitialLoadComplete: boolean;
  selectedFont: SessionFontRecord | null;
  setMainTab: (tab: string) => void;
  setClosedLibraryFontIds: Dispatch<SetStateAction<string[]>>;
  isFontStoredInAnyLibrary: (font: SessionFontRecord | null) => boolean;
  hasRestoredEditorMainTab: boolean;
  emptySlotIds: string[];
  fontsVisibleInTabBar: SessionFontRecord[];
  fontTabPlaceholders: TabStripPlaceholder[] | null;
  setPlainPreviewOpen: (open: boolean) => void;
  setCatalogSelectionActions: (actions: typeof EMPTY_SELECTION_TOOLBAR_ACTIONS) => void;
  setEmptyTabSelectionActions: (actions: typeof EMPTY_SELECTION_TOOLBAR_ACTIONS) => void;
};

/**
 * Синхронизация shell: валидность вкладок, сброс selection toolbar, plain preview, debug.
 */
export function useEditorShellEffects({
  mainTab,
  fontsLibraryTab,
  fontLibraries,
  setFontsLibraryTab,
  fonts,
  isInitialLoadComplete,
  selectedFont,
  setMainTab,
  setClosedLibraryFontIds,
  isFontStoredInAnyLibrary,
  hasRestoredEditorMainTab,
  emptySlotIds,
  fontsVisibleInTabBar,
  fontTabPlaceholders,
  setPlainPreviewOpen,
  setCatalogSelectionActions,
  setEmptyTabSelectionActions,
}: UseEditorShellEffectsParams): void {
  useEffect(() => {
    if (fontsLibraryTab === 'catalog') return;
    const libraryId = readSavedLibraryId(fontsLibraryTab);
    if (!libraryId || !fontLibraries.some((library) => library.id === libraryId)) {
      setFontsLibraryTab('catalog');
    }
  }, [fontLibraries, fontsLibraryTab, setFontsLibraryTab]);

  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const fontsById = new Map(fonts.map((font) => [font.id, font]));
    setClosedLibraryFontIds((prev) =>
      prev.filter((fontId) => {
        const font = fontsById.get(fontId);
        return Boolean(font) && isFontStoredInAnyLibrary(font);
      }),
    );
  }, [fonts, isFontStoredInAnyLibrary, isInitialLoadComplete, setClosedLibraryFontIds]);

  useEffect(() => {
    if (!isInitialLoadComplete) return;
    if (mainTab === EDITOR_MAIN_TAB_PENDING) return;
    if (mainTab === 'library' || mainTab.startsWith(EMPTY_PREFIX)) return;
    if (fonts.length === 0) return;
    const exists = fonts.some((f) => f.id === mainTab);
    if (!exists) {
      if (selectedFont?.id && fonts.some((f) => f.id === selectedFont.id)) {
        setClosedLibraryFontIds((prev) => prev.filter((id) => id !== selectedFont.id));
        setMainTab(selectedFont.id);
      } else {
        setMainTab('library');
      }
    }
  }, [isInitialLoadComplete, fonts, mainTab, selectedFont, setClosedLibraryFontIds, setMainTab]);

  useEffect(() => {
    let editorUiReady: string | null = null;
    let showNewFallback: string | null = null;
    if (typeof document !== 'undefined') {
      editorUiReady = document.documentElement.dataset.editorUiReady ?? null;
      showNewFallback = document.documentElement.dataset.editorShowNewFallback ?? null;
    }
    const tabbarBranch = mainTab === EDITOR_MAIN_TAB_PENDING ? 'skeleton' : 'EditorTabBar';
    editorShellDbg('index: UI shell / таббар', {
      mainTab,
      hasRestoredEditorMainTab,
      isInitialLoadComplete,
      tabbarBranch,
      editorUiReady,
      editorShowNewFallback: showNewFallback,
      emptySlots: emptySlotIds.length,
      fontsVisibleTabBar: fontsVisibleInTabBar.length,
      placeholdersCount: Array.isArray(fontTabPlaceholders) ? fontTabPlaceholders.length : 0,
    });
  }, [
    mainTab,
    hasRestoredEditorMainTab,
    isInitialLoadComplete,
    emptySlotIds.length,
    fontsVisibleInTabBar.length,
    fontTabPlaceholders,
  ]);

  useEffect(() => {
    if (
      mainTab === EDITOR_MAIN_TAB_PENDING ||
      mainTab === 'library' ||
      mainTab.startsWith(EMPTY_PREFIX) ||
      !selectedFont
    ) {
      setPlainPreviewOpen(false);
    }
  }, [mainTab, selectedFont, setPlainPreviewOpen]);

  useEffect(() => {
    if (mainTab === 'library' && fontsLibraryTab === 'catalog') return;
    setCatalogSelectionActions(EMPTY_SELECTION_TOOLBAR_ACTIONS);
  }, [mainTab, fontsLibraryTab, setCatalogSelectionActions]);

  useEffect(() => {
    if (mainTab.startsWith(EMPTY_PREFIX)) return;
    setEmptyTabSelectionActions(EMPTY_SELECTION_TOOLBAR_ACTIONS);
  }, [mainTab, setEmptyTabSelectionActions]);
}
