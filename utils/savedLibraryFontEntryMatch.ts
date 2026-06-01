import { sanitizeLibraryFont } from './fontLibraryUtils';
import { libraryEntryMatchesInput } from './libraryFontIdentity';
import type { SavedLibraryFontEntry, SavedLibraryFontEntryInput } from '../types/savedLibrary';
import type { SavedLibraryRecord } from '../types/editorFonts';

/** Сопоставление записи библиотеки с элементами в других библиотеках (move между libraries). */
export function createSavedLibraryFontEntryMatcher(fontEntry: SavedLibraryFontEntryInput) {
  const entry = sanitizeLibraryFont(fontEntry);
  if (!entry) return null;

  const matchesEntry = (item: SavedLibraryFontEntry) => {
    return libraryEntryMatchesInput(item, fontEntry);
  };

  return { entry, matchesEntry };
}

export function findCanonicalLibraryFontEntry(
  fontLibraries: SavedLibraryRecord[],
  matchesEntry: (item: SavedLibraryFontEntry) => boolean,
): SavedLibraryFontEntry | null {
  for (const library of Array.isArray(fontLibraries) ? fontLibraries : []) {
    const hit = (Array.isArray(library.fonts) ? library.fonts : []).find(matchesEntry);
    if (hit) return hit;
  }
  return null;
}
