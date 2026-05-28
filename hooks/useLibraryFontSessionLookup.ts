import { useCallback, useMemo } from 'react';
import {
  buildLibraryFontEntryKeys,
  buildSessionFontLookup,
  isFontStoredInAnyLibrary as isFontStoredInAnyLibraryImpl,
  resolveSessionFontForLibraryEntry as resolveSessionFontForLibraryEntryImpl,
} from '../utils/libraryFontSessionLookup';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';

type UseLibraryFontSessionLookupParams = {
  fonts: SessionFontRecord[];
  fontLibraries: SavedLibraryRecord[];
};

/**
 * Связь session-шрифтов редактора с записями сохранённых библиотек.
 */
export function useLibraryFontSessionLookup({ fonts, fontLibraries }: UseLibraryFontSessionLookupParams) {
  const libraryFontEntryKeys = useMemo(
    () => buildLibraryFontEntryKeys(fontLibraries),
    [fontLibraries],
  );

  const sessionFontLookup = useMemo(() => buildSessionFontLookup(fonts), [fonts]);

  const resolveSessionFontForLibraryEntry = useCallback(
    (entry: { id?: string; source?: string }) =>
      resolveSessionFontForLibraryEntryImpl(entry, sessionFontLookup),
    [sessionFontLookup],
  );

  const isFontStoredInAnyLibrary = useCallback(
    (font: SessionFontRecord) => isFontStoredInAnyLibraryImpl(font, libraryFontEntryKeys),
    [libraryFontEntryKeys],
  );

  return {
    libraryFontEntryKeys,
    sessionFontLookup,
    resolveSessionFontForLibraryEntry,
    isFontStoredInAnyLibrary,
  };
}
