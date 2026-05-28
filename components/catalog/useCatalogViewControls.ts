import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATALOG_PREVIEW_PRESET_NAME, CATALOG_PREVIEW_FONT_SIZE_DEFAULT_PX } from '../../utils/catalogPreviewSample';
import type { CatalogViewMode } from './CatalogGridModeToggle';

const CATALOG_SEARCH_DEBOUNCE_MS = 180;

export type UseCatalogViewControlsConfig = {
  initialSortMode?: string;
  initialGridViewMode?: CatalogViewMode;
  includeSearchInHasActiveFilters?: boolean;
  clearSearchOnClearFilters?: boolean;
};

export function useCatalogViewControls({
  initialSortMode,
  initialGridViewMode = 'grid',
  includeSearchInHasActiveFilters = true,
  clearSearchOnClearFilters = true,
}: UseCatalogViewControlsConfig = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [sortMode, setSortMode] = useState(initialSortMode);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubset, setFilterSubset] = useState<string[]>([]);
  const [filterVariable, setFilterVariable] = useState('all');
  const [filterLicense, setFilterLicense] = useState('');
  const [filterFeeling, setFilterFeeling] = useState('');
  const [filterShape, setFilterShape] = useState('');
  const [filterCalligraphy, setFilterCalligraphy] = useState('');
  const [filterItalicOnly, setFilterItalicOnly] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [gridViewMode, setGridViewMode] = useState<CatalogViewMode>(initialGridViewMode);
  const [previewSamplePreset, setPreviewSamplePreset] = useState(CATALOG_PREVIEW_PRESET_NAME);
  const [previewCustomText, setPreviewCustomText] = useState('');
  const [previewFontSizePx, setPreviewFontSizePx] = useState(CATALOG_PREVIEW_FONT_SIZE_DEFAULT_PX);

  const searchQueryTrimmed = searchQuery.trim();
  const [searchQueryDebouncedTrimmed, setSearchQueryDebouncedTrimmed] = useState('');

  useEffect(() => {
    const next = searchQuery.trim();
    const timer = window.setTimeout(() => {
      setSearchQueryDebouncedTrimmed(next);
    }, CATALOG_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const hasActiveFilters = useMemo(() => {
    return (
      (includeSearchInHasActiveFilters ? Boolean(searchQueryTrimmed) : false) ||
      Boolean(filterCategory) ||
      (Array.isArray(filterSubset) && filterSubset.length > 0) ||
      filterVariable !== 'all' ||
      Boolean(filterLicense) ||
      Boolean(filterFeeling) ||
      Boolean(filterShape) ||
      Boolean(filterCalligraphy) ||
      filterItalicOnly ||
      Boolean(filterRole)
    );
  }, [
    includeSearchInHasActiveFilters,
    searchQueryTrimmed,
    filterCategory,
    filterSubset,
    filterVariable,
    filterLicense,
    filterFeeling,
    filterShape,
    filterCalligraphy,
    filterItalicOnly,
    filterRole,
  ]);

  const clearFilters = useCallback(() => {
    if (clearSearchOnClearFilters) setSearchQuery('');
    setFilterCategory('');
    setFilterSubset([]);
    setFilterVariable('all');
    setFilterLicense('');
    setFilterFeeling('');
    setFilterShape('');
    setFilterCalligraphy('');
    setFilterItalicOnly(false);
    setFilterRole('');
  }, [clearSearchOnClearFilters]);

  return {
    searchQuery,
    setSearchQuery,
    searchQueryTrimmed,
    searchQueryDebouncedTrimmed,
    isSearchFocused,
    setIsSearchFocused,

    sortMode,
    setSortMode,
    filterCategory,
    setFilterCategory,
    filterSubset,
    setFilterSubset,
    filterVariable,
    setFilterVariable,
    filterLicense,
    setFilterLicense,
    filterFeeling,
    setFilterFeeling,
    filterShape,
    setFilterShape,
    filterCalligraphy,
    setFilterCalligraphy,
    filterItalicOnly,
    setFilterItalicOnly,
    filterRole,
    setFilterRole,
    gridViewMode,
    setGridViewMode,

    previewSamplePreset,
    setPreviewSamplePreset,
    previewCustomText,
    setPreviewCustomText,
    previewFontSizePx,
    setPreviewFontSizePx,

    hasActiveFilters,
    clearFilters,
  };
}

export type CatalogViewControls = ReturnType<typeof useCatalogViewControls>;
