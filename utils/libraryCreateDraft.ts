import type { SavedLibraryRecord } from '../types/editorFonts';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';

export type LibraryCreateDraft = {
  mode: 'create' | 'edit';
  editingLibraryId: string | null;
  libraryName: string;
  searchQuery: string;
  selectedFonts: SavedLibraryFontEntry[];
};

export function normalizeDraftFonts(fonts: unknown): SavedLibraryFontEntry[] {
  return (Array.isArray(fonts) ? fonts : []).filter(
    (item): item is SavedLibraryFontEntry =>
      Boolean(item && typeof item === 'object' && typeof (item as SavedLibraryFontEntry).label === 'string'),
  );
}

export function createEmptyLibraryDraft(): LibraryCreateDraft {
  return {
    mode: 'create',
    editingLibraryId: null,
    libraryName: '',
    searchQuery: '',
    selectedFonts: [],
  };
}

export function createLibraryDraftWithFonts(selectedFonts: SavedLibraryFontEntry[] = []): LibraryCreateDraft {
  return {
    ...createEmptyLibraryDraft(),
    selectedFonts: normalizeDraftFonts(selectedFonts),
  };
}

export function createLibraryEditDraft(library: SavedLibraryRecord | null | undefined): LibraryCreateDraft {
  return {
    mode: 'edit',
    editingLibraryId: library?.id || null,
    libraryName: library?.name || '',
    searchQuery: '',
    selectedFonts: normalizeDraftFonts(library?.fonts),
  };
}
