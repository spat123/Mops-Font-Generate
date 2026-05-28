import { sanitizeLibraryFont, stampLibraryFontAddedNow } from './fontLibraryUtils';
import type { SavedLibraryRecord } from '../types/editorFonts';

type SavedLibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

export type ApplySavedLibraryFontMoveParams = {
  activeSavedLibrary: SavedLibraryRecord | null;
  targetLibraryId: string;
  fontLibraries: SavedLibraryRecord[];
  normalizedEntries: SavedLibraryFontEntry[];
  handleUpdateSavedLibrary: (libraryId: string, draft: Partial<SavedLibraryRecord>) => void;
};

export type ApplySavedLibraryFontMoveResult = {
  ok: boolean;
  movedCount: number;
  targetName: string;
};

/**
 * Перенос записей из activeSavedLibrary в targetLibrary (bulk или одна).
 */
export function applySavedLibraryFontMove({
  activeSavedLibrary,
  targetLibraryId,
  fontLibraries,
  normalizedEntries,
  handleUpdateSavedLibrary,
}: ApplySavedLibraryFontMoveParams): ApplySavedLibraryFontMoveResult {
  const sourceLibrary = activeSavedLibrary;
  if (!sourceLibrary?.id || !targetLibraryId || targetLibraryId === sourceLibrary.id) {
    return { ok: false, movedCount: 0, targetName: '' };
  }

  const entries = (Array.isArray(normalizedEntries) ? normalizedEntries : [])
    .map((entry) => sanitizeLibraryFont(entry))
    .filter((entry) => entry != null) as SavedLibraryFontEntry[];
  if (entries.length === 0) {
    return { ok: false, movedCount: 0, targetName: '' };
  }

  const targetLibrary = fontLibraries.find((library) => library.id === targetLibraryId);
  if (!targetLibrary) {
    return { ok: false, movedCount: 0, targetName: '' };
  }

  const selectedIdSet = new Set(entries.map((entry) => String(entry.id || '').trim()).filter(Boolean));
  const sourceFonts = (sourceLibrary.fonts || []).filter(
    (item) => !selectedIdSet.has(String(item?.id || '').trim()),
  );
  const targetExistingIds = new Set(
    (targetLibrary.fonts || []).map((item) => String(item?.id || '').trim()),
  );
  const movedEntries = entries
    .filter((entry) => !targetExistingIds.has(String(entry.id || '').trim()))
    .map((entry) => stampLibraryFontAddedNow(entry) || entry);

  handleUpdateSavedLibrary(sourceLibrary.id, { fonts: sourceFonts });
  handleUpdateSavedLibrary(targetLibraryId, {
    fonts: [...(targetLibrary.fonts || []), ...movedEntries],
  });

  return { ok: true, movedCount: movedEntries.length, targetName: targetLibrary.name };
}
