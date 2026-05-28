import type { SavedLibraryRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';

export const LIBRARY_NAME_MAX_LENGTH = 32;
export const FONT_LIBRARY_DRAFT_STORAGE_KEY = 'fontLibrarySidebarDraft';

export type LibraryCreateDialogDraft = {
  mode: 'create' | 'edit';
  editingLibraryId: string | null;
  libraryName: string;
  searchQuery: string;
  selectedFonts: SavedLibraryFontEntry[];
};

export function createEmptyDraft(): LibraryCreateDialogDraft {
  return {
    mode: 'create',
    editingLibraryId: null,
    libraryName: '',
    searchQuery: '',
    selectedFonts: [],
  };
}

function normalizeDraftFonts(fonts: unknown): SavedLibraryFontEntry[] {
  return (Array.isArray(fonts) ? fonts : []).filter(
    (item): item is SavedLibraryFontEntry =>
      Boolean(item && typeof item === 'object' && typeof (item as SavedLibraryFontEntry).label === 'string'),
  );
}

export function createDraftWithFonts(selectedFonts: SavedLibraryFontEntry[] = []): LibraryCreateDialogDraft {
  return {
    ...createEmptyDraft(),
    selectedFonts: normalizeDraftFonts(selectedFonts),
  };
}

export function createEditDraft(library: SavedLibraryRecord | null | undefined): LibraryCreateDialogDraft {
  return {
    mode: 'edit',
    editingLibraryId: library?.id || null,
    libraryName: library?.name || '',
    searchQuery: '',
    selectedFonts: normalizeDraftFonts(library?.fonts),
  };
}

function sanitizeDraft(draft: unknown): LibraryCreateDialogDraft {
  if (!draft || typeof draft !== 'object') return createEmptyDraft();
  const raw = draft as LibraryCreateDialogDraft;
  return {
    mode: raw.mode === 'edit' ? 'edit' : 'create',
    editingLibraryId: typeof raw.editingLibraryId === 'string' ? raw.editingLibraryId : null,
    libraryName: String(raw.libraryName || ''),
    searchQuery: String(raw.searchQuery || ''),
    selectedFonts: normalizeDraftFonts(raw.selectedFonts),
  };
}

export function readStoredLibraryCreateDraft(): LibraryCreateDialogDraft {
  if (typeof window === 'undefined') return createEmptyDraft();
  try {
    const raw = window.localStorage.getItem(FONT_LIBRARY_DRAFT_STORAGE_KEY);
    return raw ? sanitizeDraft(JSON.parse(raw)) : createEmptyDraft();
  } catch {
    return createEmptyDraft();
  }
}
