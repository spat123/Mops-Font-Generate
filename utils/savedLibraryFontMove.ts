import {
  buildDuplicatedLibraryFontEntry,
  countSameCatalogFontInLibrary,
  sanitizeLibraryFont,
  stampLibraryFontAddedNow,
} from './fontLibraryUtils';
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

  const targetExistingIds = new Set(
    (targetLibrary.fonts || []).map((item) => String(item?.id || '').trim()).filter(Boolean),
  );
  const idsToRemoveFromSource = new Set<string>();
  const movedEntries: SavedLibraryFontEntry[] = [];
  let targetFontsDraft = [...(targetLibrary.fonts || [])];

  for (const entry of entries) {
    const sourceId = String(entry.id || '').trim();
    if (!sourceId) continue;
    if (targetExistingIds.has(sourceId)) {
      continue;
    }

    let entryToAdd = stampLibraryFontAddedNow(entry) || entry;
    if (countSameCatalogFontInLibrary(entryToAdd, targetFontsDraft) > 0) {
      const duplicate = buildDuplicatedLibraryFontEntry(entryToAdd, targetFontsDraft);
      if (!duplicate) continue;
      entryToAdd = duplicate;
    }

    const nextId = String(entryToAdd.id || '').trim();
    if (!nextId || targetExistingIds.has(nextId)) continue;

    movedEntries.push(entryToAdd);
    idsToRemoveFromSource.add(sourceId);
    targetExistingIds.add(nextId);
    targetFontsDraft = [...targetFontsDraft, entryToAdd];
  }

  if (movedEntries.length === 0) {
    return { ok: false, movedCount: 0, targetName: targetLibrary.name };
  }

  const sourceFonts = (sourceLibrary.fonts || []).filter(
    (item) => !idsToRemoveFromSource.has(String(item?.id || '').trim()),
  );

  handleUpdateSavedLibrary(sourceLibrary.id, { fonts: sourceFonts });
  handleUpdateSavedLibrary(targetLibraryId, {
    fonts: [...(targetLibrary.fonts || []), ...movedEntries],
  });

  return { ok: true, movedCount: movedEntries.length, targetName: targetLibrary.name };
}
