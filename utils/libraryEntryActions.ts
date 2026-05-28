import type { SavedLibraryFontEntry } from '../types/savedLibrary';

function isValidLibraryEntry(libraryEntry: unknown): libraryEntry is SavedLibraryFontEntry {
  return Boolean(
    libraryEntry &&
      typeof libraryEntry === 'object' &&
      typeof (libraryEntry as SavedLibraryFontEntry).label === 'string' &&
      (libraryEntry as SavedLibraryFontEntry).label?.trim(),
  );
}

export type AddLibraryEntryToLibraryParams = {
  libraryId: string;
  libraryEntry: SavedLibraryFontEntry;
  onAddFontToLibrary: (libraryId: string, libraryEntry: SavedLibraryFontEntry) => boolean | Promise<boolean>;
};

export async function addLibraryEntryToLibrary({
  libraryId,
  libraryEntry,
  onAddFontToLibrary,
}: AddLibraryEntryToLibraryParams): Promise<boolean> {
  if (!libraryId || !isValidLibraryEntry(libraryEntry) || typeof onAddFontToLibrary !== 'function') {
    return false;
  }
  return (await onAddFontToLibrary(libraryId, libraryEntry)) !== false;
}

export type RequestCreateLibraryFromEntryParams = {
  libraryEntry: SavedLibraryFontEntry;
  onRequestCreateLibrary: (entries: SavedLibraryFontEntry[]) => void;
};

export function requestCreateLibraryFromEntry({
  libraryEntry,
  onRequestCreateLibrary,
}: RequestCreateLibraryFromEntryParams): boolean {
  if (!isValidLibraryEntry(libraryEntry) || typeof onRequestCreateLibrary !== 'function') {
    return false;
  }
  onRequestCreateLibrary([libraryEntry]);
  return true;
}
