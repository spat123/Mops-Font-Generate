import { normalizeLibraryText, sanitizeLibraryFont } from './fontLibraryUtils';
import type { SavedLibraryFontEntry, SavedLibraryFontEntryInput } from '../types/savedLibrary';
import type { SavedLibraryRecord } from '../types/editorFonts';

/** Сопоставление записи библиотеки с элементами в других библиотеках (move между libraries). */
export function createSavedLibraryFontEntryMatcher(fontEntry: SavedLibraryFontEntryInput) {
  const entry = sanitizeLibraryFont(fontEntry);
  if (!entry) return null;

  const entryId = String(entry.id || '').trim();
  const entrySource = String(entry.source || '').trim();
  const entryLabel = normalizeLibraryText(entry.label || '').toLowerCase();
  const candidateIds = Array.isArray(fontEntry?.candidateIds)
    ? fontEntry.candidateIds.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const candidateLabels = Array.isArray(fontEntry?.candidateLabels)
    ? fontEntry.candidateLabels
        .map((value) => normalizeLibraryText(value || '').toLowerCase())
        .filter(Boolean)
    : [];

  const matchesEntry = (item: SavedLibraryFontEntry) => {
    const itemId = String(item?.id || '').trim();
    if (entryId && itemId === entryId) return true;
    if (candidateIds.includes(itemId)) return true;
    const itemSource = String(item?.source || '').trim();
    const itemLabel = normalizeLibraryText(item?.label || '').toLowerCase();
    if (entrySource && entryLabel && itemSource === entrySource && itemLabel === entryLabel) return true;
    if (
      entrySource &&
      candidateLabels.length > 0 &&
      itemSource === entrySource &&
      candidateLabels.includes(itemLabel)
    ) {
      return true;
    }
    return false;
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
