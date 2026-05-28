import { useCallback } from 'react';
import {
  prefetchFontsourceLibraryFontEntry,
  prefetchGoogleLibraryFontEntry,
} from '../utils/catalogLibraryBackgroundPrefetch';
import type { SavedLibraryRecord } from '../types/editorFonts';

type LibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

export function useLibraryEntryPrefetch() {
  return useCallback((entry: LibraryFontEntry | null | undefined) => {
    if (!entry) return;
    const src = String(entry.source || '').trim();
    if (src === 'google') {
      prefetchGoogleLibraryFontEntry(entry);
    } else if (src === 'fontsource') {
      prefetchFontsourceLibraryFontEntry(entry);
    }
  }, []);
}
