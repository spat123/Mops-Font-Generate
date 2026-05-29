import { useCallback, useMemo } from 'react';
import { buildGroupedFontSubsetOptions } from '../utils/fontSubsetLabels';
import { buildSavedLibraryCatalogLookup } from '../utils/savedLibraryCatalogLookup';
import {
  applySessionFontMetaHints,
  resolveSavedLibraryFontCatalogMeta,
} from '../utils/savedLibraryCatalogFontMeta';
import { filterSavedLibraryFonts, scopeSavedLibraryFonts } from '../utils/filterSavedLibraryFonts';
import { searchSavedLibraryCatalog } from '../utils/searchSavedLibraryCatalog';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';

type SavedLibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

type UseSavedLibraryDerivedStateParams = {
  activeSavedLibrary: SavedLibraryRecord | null;
  savedLibraryFontsScope: string;
  savedLibrarySearchQueryTrimmed: string;
  savedLibraryFilterSubsets: string[];
  savedLibraryFilterVariable: string;
  savedLibraryFilterItalic: boolean;
};

/**
 * Lookup каталога, фильтрация шрифтов библиотеки и поиск по каталогу.
 */
export function useSavedLibraryDerivedState({
  activeSavedLibrary,
  savedLibraryFontsScope,
  savedLibrarySearchQueryTrimmed,
  savedLibraryFilterSubsets,
  savedLibraryFilterVariable,
  savedLibraryFilterItalic,
}: UseSavedLibraryDerivedStateParams) {
  const catalogLookup = useMemo(() => buildSavedLibraryCatalogLookup(), [
    activeSavedLibrary,
    savedLibraryFilterItalic,
    savedLibraryFilterSubsets,
    savedLibraryFilterVariable,
    savedLibrarySearchQueryTrimmed,
  ]);

  const availableSavedLibrarySubsets = useMemo(() => {
    if (!activeSavedLibrary) return [];
    const set = new Set<string>();
    (Array.isArray(activeSavedLibrary.fonts) ? activeSavedLibrary.fonts : []).forEach((font) => {
      const { subsets } = resolveSavedLibraryFontCatalogMeta(font, catalogLookup);
      subsets.forEach((subset) => set.add(String(subset)));
    });
    return Array.from(set);
  }, [activeSavedLibrary, catalogLookup]);

  const savedLibrarySubsetOptions = useMemo(
    () =>
      buildGroupedFontSubsetOptions(availableSavedLibrarySubsets, savedLibraryFilterSubsets, {
        includeSelectedSection: false,
      }),
    [availableSavedLibrarySubsets, savedLibraryFilterSubsets],
  );

  const buildSavedLibraryCardMetaParts = useCallback(
    (font: SavedLibraryFontEntry, sessionFont: SessionFontRecord | null = null) => {
      const { isVariable, hasItalic } = applySessionFontMetaHints(
        resolveSavedLibraryFontCatalogMeta(font, catalogLookup),
        sessionFont,
      );
      const parts: string[] = [];
      if (isVariable) parts.push('vf');
      if (hasItalic) parts.push('italic');
      return parts;
    },
    [catalogLookup],
  );

  const filteredActiveSavedLibraryFonts = useMemo(() => {
    if (!activeSavedLibrary) return [];
    const scoped = scopeSavedLibraryFonts(activeSavedLibrary.fonts, savedLibraryFontsScope);
    return filterSavedLibraryFonts({
      fonts: scoped,
      searchQueryTrimmed: savedLibrarySearchQueryTrimmed,
      filterSubsets: savedLibraryFilterSubsets,
      filterVariable: savedLibraryFilterVariable,
      filterItalic: savedLibraryFilterItalic,
      catalogLookup,
    });
  }, [
    activeSavedLibrary,
    catalogLookup,
    savedLibraryFilterItalic,
    savedLibraryFilterSubsets,
    savedLibraryFilterVariable,
    savedLibraryFontsScope,
    savedLibrarySearchQueryTrimmed,
  ]);

  const catalogSearchResults = useMemo(() => {
    if (!activeSavedLibrary || !savedLibrarySearchQueryTrimmed) return [];
    const libraryFontIds = new Set(
      (activeSavedLibrary.fonts || []).map((f) => String(f?.id || '').trim()),
    );
    return searchSavedLibraryCatalog({
      searchQueryTrimmed: savedLibrarySearchQueryTrimmed,
      libraryFontIds,
    });
  }, [activeSavedLibrary, savedLibrarySearchQueryTrimmed]);

  return {
    catalogLookup,
    availableSavedLibrarySubsets,
    savedLibrarySubsetOptions,
    buildSavedLibraryCardMetaParts,
    filteredActiveSavedLibraryFonts,
    catalogSearchResults,
  };
}
