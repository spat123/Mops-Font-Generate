import { useCallback, useMemo, useState } from 'react';

export function useCatalogViewControls({
  initialSortMode,
  initialGridViewMode = 'grid',
  includeSearchInHasActiveFilters = true,
  clearSearchOnClearFilters = true,
} = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [sortMode, setSortMode] = useState(initialSortMode);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubset, setFilterSubset] = useState([]);
  const [filterVariable, setFilterVariable] = useState('all');
  const [filterItalicOnly, setFilterItalicOnly] = useState(false);
  const [gridViewMode, setGridViewMode] = useState(initialGridViewMode);

  const searchQueryTrimmed = searchQuery.trim();

  const hasActiveFilters = useMemo(() => {
    return (
      (includeSearchInHasActiveFilters ? Boolean(searchQueryTrimmed) : false) ||
      Boolean(filterCategory) ||
      (Array.isArray(filterSubset) && filterSubset.length > 0) ||
      filterVariable !== 'all' ||
      filterItalicOnly
    );
  }, [
    includeSearchInHasActiveFilters,
    searchQueryTrimmed,
    filterCategory,
    filterSubset,
    filterVariable,
    filterItalicOnly,
  ]);

  const clearFilters = useCallback(() => {
    if (clearSearchOnClearFilters) setSearchQuery('');
    setFilterCategory('');
    setFilterSubset([]);
    setFilterVariable('all');
    setFilterItalicOnly(false);
  }, [clearSearchOnClearFilters]);

  return {
    searchQuery,
    setSearchQuery,
    searchQueryTrimmed,
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
    filterItalicOnly,
    setFilterItalicOnly,
    gridViewMode,
    setGridViewMode,

    hasActiveFilters,
    clearFilters,
  };
}

