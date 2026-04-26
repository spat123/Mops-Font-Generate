import { useMemo } from 'react';
import { buildGroupedFontSubsetOptions } from '../../utils/fontSubsetLabels';
import { buildCatalogFacets } from '../../utils/catalogFilterSort';

export function useCatalogToolbarProps({
  trailingToolbar,
  trailingContainerRef,
  viewportW,
  toolbarAlignToGrid,
  oneCardWidthPx,

  ids,
  controls,

  searchPlaceholder,
  count,
  countTotal,

  sortOptions,
  clearFiltersButtonClassName,

  facetItems,
  getCategory,
  getSubsets,
  compareCategory,
  compareSubset,
  getCategoryLabel,
}) {
  const { categories, subsets } = useMemo(
    () =>
      buildCatalogFacets(facetItems, {
        getCategory,
        getSubsets,
        compareCategory,
        compareSubset,
      }),
    [facetItems, getCategory, getSubsets, compareCategory, compareSubset],
  );

  const subsetOptions = useMemo(
    // Для multi-select лучше не "перетаскивать" выбранные пункты вверх в секцию "Выбрано":
    // иначе список прыгает, и выглядит как будто селект закрылся.
    () => buildGroupedFontSubsetOptions(subsets, controls.filterSubset, { includeSelectedSection: false }),
    [subsets, controls.filterSubset],
  );

  const countSuffix =
    Number(count) !== Number(countTotal) ? ` из ${Number(countTotal) || 0}` : ' шт.';

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c, label: getCategoryLabel?.(c) ?? String(c) })),
    [categories, getCategoryLabel],
  );

  const toolbarProps = useMemo(
    () => ({
      trailingToolbar,
      trailingContainerRef,
      viewportW,
      toolbarAlignToGrid,
      oneCardWidthPx,

      searchId: ids.searchId,
      searchValue: controls.searchQuery,
      onSearchChange: controls.setSearchQuery,
      searchPlaceholder,
      searchCount: count,
      searchCountSuffix: countSuffix,
      onSearchFocusChange: controls.setIsSearchFocused,
      searchActionDisabled: !controls.isSearchFocused,

      categoryFilterId: ids.categoryFilterId,
      categoryValue: controls.filterCategory,
      onCategoryChange: controls.setFilterCategory,
      categoryOptions,

      variableFilterId: ids.variableFilterId,
      variableValue: controls.filterVariable,
      onVariableChange: controls.setFilterVariable,

      subsetFilterId: ids.subsetFilterId,
      subsetValue: controls.filterSubset,
      onSubsetChange: controls.setFilterSubset,
      subsetOptions,

      italicOnly: controls.filterItalicOnly,
      onItalicOnlyChange: controls.setFilterItalicOnly,

      sortValue: controls.sortMode,
      onSortChange: controls.setSortMode,
      sortOptions,

      gridViewMode: controls.gridViewMode,
      onGridViewModeChange: controls.setGridViewMode,

      hasActiveFilters: controls.hasActiveFilters,
      onClearFilters: controls.clearFilters,
      clearFiltersButtonClassName,
    }),
    [
      trailingToolbar,
      trailingContainerRef,
      viewportW,
      toolbarAlignToGrid,
      oneCardWidthPx,
      ids.searchId,
      ids.categoryFilterId,
      ids.variableFilterId,
      ids.subsetFilterId,
      controls.searchQuery,
      controls.setSearchQuery,
      controls.setIsSearchFocused,
      controls.isSearchFocused,
      controls.filterCategory,
      controls.setFilterCategory,
      controls.filterVariable,
      controls.setFilterVariable,
      controls.filterSubset,
      controls.setFilterSubset,
      controls.filterItalicOnly,
      controls.setFilterItalicOnly,
      controls.sortMode,
      controls.setSortMode,
      controls.gridViewMode,
      controls.setGridViewMode,
      controls.hasActiveFilters,
      controls.clearFilters,
      searchPlaceholder,
      count,
      countSuffix,
      categoryOptions,
      subsetOptions,
      sortOptions,
      clearFiltersButtonClassName,
    ],
  );

  return { toolbarProps, categories, subsets, subsetOptions, categoryOptions, countSuffix };
}
