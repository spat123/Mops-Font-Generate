import { useCallback } from 'react';
import {
  prefetchFontsourceLibraryFontEntry,
  prefetchGoogleLibraryFontEntry,
} from '../utils/catalogLibraryBackgroundPrefetch';

export function useLibraryEntryPrefetch() {
  return useCallback((entry) => {
    if (!entry) return;
    const src = String(entry.source || '').trim();
    if (src === 'google') {
      prefetchGoogleLibraryFontEntry(entry);
    } else if (src === 'fontsource') {
      prefetchFontsourceLibraryFontEntry(entry);
    }
  }, []);
}

