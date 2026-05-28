import type { SavedLibraryRecord } from './editorFonts';
import type { SavedLibraryCatalogSearchRow } from './savedLibraryCard';

export type SavedLibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

export type SavedLibraryFontEntryInput = SavedLibraryFontEntry & {
  candidateIds?: string[];
  candidateLabels?: string[];
};

export type SavedLibraryCatalogLookup = {
  googleByFamily: Map<string, Record<string, unknown>>;
  fontsourceBySlug: Map<string, Record<string, unknown>>;
};

export type SavedLibraryFontCatalogMeta = {
  subsets: string[];
  isVariable: boolean;
  hasItalic: boolean;
  source: string;
  id: string;
  label: string;
};

export type SessionFontLookup = {
  byLabel: Map<string, import('./editorFonts').SessionFontRecord>;
  byLibraryEntryId: Map<string, import('./editorFonts').SessionFontRecord>;
  bySourceLabel: Map<string, import('./editorFonts').SessionFontRecord>;
};

export type SelectionToolbarActions = {
  selectedCount: number;
  downloadSelected: (() => void) | null;
  downloadSelectedAsFormat: ((format: string) => void) | null;
  moveSelected: ((targetLibraryId: string) => void) | null;
  createLibraryFromSelection: (() => void) | null;
};

export type SearchSavedLibraryCatalogParams = {
  searchQueryTrimmed: string;
  libraryFontIds: Set<string>;
};

export type SearchSavedLibraryCatalogResult = SavedLibraryCatalogSearchRow[];
