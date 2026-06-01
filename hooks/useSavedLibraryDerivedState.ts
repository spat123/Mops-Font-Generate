import { useCallback, useMemo } from 'react';
import { buildCatalogCardMetaSplit, type CatalogCardMetaSplit } from '../utils/buildCatalogCardMetaParts';
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
  /** Инкремент после фоновой подгрузки каталога (см. useCatalogCachesWarmup). */
  catalogCacheRevision?: number;
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
  catalogCacheRevision = 0,
}: UseSavedLibraryDerivedStateParams) {
  const catalogLookup = useMemo(() => buildSavedLibraryCatalogLookup(), [
    catalogCacheRevision,
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

  const buildSavedLibraryCardMetaSplit = useCallback(
    (font: SavedLibraryFontEntry, sessionFont: SessionFontRecord | null = null): CatalogCardMetaSplit => {
      const meta = resolveSavedLibraryFontCatalogMeta(font, catalogLookup);
      const { isVariable, hasItalic } = applySessionFontMetaHints(meta, sessionFont);
      return buildCatalogCardMetaSplit({
        category: meta.category,
        subsets: meta.subsets,
        isVariable,
        hasItalic,
        styleCount: meta.styleCount,
        includeTrial: meta.source === 'fontfabric-trial',
      });
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
  }, [activeSavedLibrary, catalogCacheRevision, savedLibrarySearchQueryTrimmed]);

  return {
    catalogLookup,
    availableSavedLibrarySubsets,
    savedLibrarySubsetOptions,
    buildSavedLibraryCardMetaSplit,
    filteredActiveSavedLibraryFonts,
    catalogSearchResults,
  };
}
