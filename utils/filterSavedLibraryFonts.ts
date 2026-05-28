import {
  isDynamicLibraryFontSource,
  isLibraryFontRecentlyAdded,
  isLocalLibraryFontSource,
} from './fontLibraryUtils';
import { matchesSearch } from './searchMatching';
import { resolveSavedLibraryFontCatalogMeta } from './savedLibraryCatalogFontMeta';
import type { SavedLibraryCatalogLookup, SavedLibraryFontEntry } from '../types/savedLibrary';

export function scopeSavedLibraryFonts(
  fonts: SavedLibraryFontEntry[] | null | undefined,
  scope: string,
): SavedLibraryFontEntry[] {
  const list = Array.isArray(fonts) ? fonts : [];
  if (scope === 'recent') return list.filter((font) => isLibraryFontRecentlyAdded(font));
  if (scope === 'local') return list.filter((font) => isLocalLibraryFontSource(font?.source));
  if (scope === 'dynamic') return list.filter((font) => isDynamicLibraryFontSource(font?.source));
  return list;
}

export type FilterSavedLibraryFontsParams = {
  fonts: SavedLibraryFontEntry[];
  searchQueryTrimmed: string;
  filterSubsets: string[];
  filterVariable: string;
  filterItalic: boolean;
  catalogLookup: SavedLibraryCatalogLookup | null;
};

export function filterSavedLibraryFonts({
  fonts,
  searchQueryTrimmed,
  filterSubsets,
  filterVariable,
  filterItalic,
  catalogLookup,
}: FilterSavedLibraryFontsParams): SavedLibraryFontEntry[] {
  const scoped = Array.isArray(fonts) ? fonts : [];
  const searchFiltered = !searchQueryTrimmed
    ? scoped
    : scoped.filter((font) =>
        matchesSearch([String(font?.label || ''), String(font?.id || '')], searchQueryTrimmed),
      );

  const subsetsActive = Array.isArray(filterSubsets) && filterSubsets.length > 0;
  const variableMode = String(filterVariable || 'all');
  const italicOnly = filterItalic === true;

  if (!subsetsActive && variableMode === 'all' && !italicOnly) return searchFiltered;

  const selectedSubsetSet = subsetsActive
    ? new Set(filterSubsets.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean))
    : null;

  return searchFiltered.filter((font) => {
    const { subsets, isVariable, hasItalic } = resolveSavedLibraryFontCatalogMeta(
      font,
      catalogLookup,
    );

    if (selectedSubsetSet) {
      const fontSubsetSet = new Set(
        subsets.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean),
      );
      let matchesAny = false;
      for (const subset of selectedSubsetSet) {
        if (fontSubsetSet.has(subset)) {
          matchesAny = true;
          break;
        }
      }
      if (!matchesAny) return false;
    }

    if (variableMode === 'variable' && !isVariable) return false;
    if (variableMode === 'static' && isVariable) return false;
    if (italicOnly && !hasItalic) return false;

    return true;
  });
}
