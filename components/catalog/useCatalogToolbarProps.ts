import { useMemo, type ReactNode, type Ref } from 'react';
import { buildGroupedFontSubsetOptions } from '../../utils/fontSubsetLabels';
import {
  buildCatalogFacets,
  buildCatalogFacetCountMaps,
  withOptionCountRightLabel,
} from '../../utils/catalogFilterSort';
import { prepareCatalogSearchQuery } from '../../utils/searchMatching';
import {
  buildCatalogLicenseFilterOptions,
  buildCatalogLicenseFacets,
  collectCatalogLicenseKeysFromItems,
} from '../../utils/catalogLicenseFilter';
import {
  buildCatalogFeelingFilterOptions,
  buildCatalogFeelingFacets,
  CATALOG_FEELING_FILTER_ORDER,
} from '../../utils/catalogFeelingFilter';
import {
  buildCatalogShapeFilterOptions,
  buildCatalogShapeFacets,
  CATALOG_SHAPE_FILTER_ORDER,
} from '../../utils/catalogShapeFilter';
import {
  buildCatalogCalligraphyFilterOptions,
  buildCatalogCalligraphyFacets,
} from '../../utils/catalogCalligraphyFilter';
import { CATALOG_ROLE_FILTER_OPTIONS } from '../../utils/catalogRoleFilter';
import type { CatalogFilterOptions, CatalogSearchableItem, CatalogSelectOption, CatalogSortOption } from '../../types/catalog';
import type { CatalogViewControls } from './useCatalogViewControls';

export type CatalogToolbarIds = {
  searchId: string;
  categoryFilterId: string;
  licenseFilterId: string;
  feelingFilterId: string;
  shapeFilterId: string;
  calligraphyFilterId: string;
  variableFilterId: string;
  subsetFilterId: string;
  previewPresetFilterId: string;
  previewCustomTextId: string;
  roleFilterId: string;
};

export type UseCatalogToolbarPropsParams<T extends CatalogSearchableItem = CatalogSearchableItem> = {
  trailingToolbar?: ReactNode;
  trailingContainerRef?: Ref<HTMLDivElement> | null;
  viewportW?: number;
  toolbarAlignToGrid?: boolean;
  oneCardWidthPx?: number | null;

  ids: CatalogToolbarIds;
  controls: CatalogViewControls;

  searchPlaceholder?: string;
  count?: number;
  countTotal?: number;

  sortOptions?: CatalogSortOption[];
  clearFiltersButtonClassName?: string;

  facetItems: T[];
  facetCountItems?: T[] | null;
  facetCountConfig?: CatalogFilterOptions<T> | null;
  filterPreserveKeys?: Set<string> | string[] | null;
  getCategory?: (item: T) => string | undefined;
  getSubsets?: (item: T) => string[] | undefined;
  compareCategory?: (a: string, b: string) => number;
  compareSubset?: (a: string, b: string) => number;
  getCategoryLabel?: (category: string) => string;
  getLicenseKeys?: (item: T) => string[];
  getLicenseLabel?: (key: string) => string;
  compareLicense?: (a: string, b: string) => number;
};

export function useCatalogToolbarProps<T extends CatalogSearchableItem = CatalogSearchableItem>({
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
  facetCountItems = null,
  facetCountConfig = null,
  filterPreserveKeys = null,
  getCategory,
  getSubsets,
  compareCategory,
  compareSubset,
  getCategoryLabel,
}: UseCatalogToolbarPropsParams<T>) {
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

  const countSuffix =
    Number(count) !== Number(countTotal) ? ` из ${Number(countTotal) || 0}` : ' шт.';

  const facetCountMaps = useMemo(() => {
    if (!facetCountConfig || !Array.isArray(facetCountItems) || facetCountItems.length === 0) {
      return null;
    }
    const searchQuery = controls.searchQueryDebouncedTrimmed;
    const filterOpts: CatalogFilterOptions<T> = {
      searchQuery,
      searchPrepared: searchQuery ? prepareCatalogSearchQuery(searchQuery) : null,
      filterCategory: controls.filterCategory,
      filterSubset: controls.filterSubset,
      filterVariable: controls.filterVariable,
      filterItalicOnly: controls.filterItalicOnly,
      filterLicense: controls.filterLicense,
      filterFeeling: controls.filterFeeling,
      filterShape: controls.filterShape,
      filterCalligraphy: controls.filterCalligraphy,
      filterRole: controls.filterRole,
      preserveKeys: filterPreserveKeys,
      ...facetCountConfig,
    };
    return buildCatalogFacetCountMaps(facetCountItems, filterOpts);
  }, [
    facetCountItems,
    facetCountConfig,
    filterPreserveKeys,
    controls.searchQueryDebouncedTrimmed,
    controls.filterCategory,
    controls.filterSubset,
    controls.filterVariable,
    controls.filterItalicOnly,
    controls.filterLicense,
    controls.filterFeeling,
    controls.filterShape,
    controls.filterCalligraphy,
    controls.filterRole,
  ]);

  const categoryOptions = useMemo(
    () =>
      withOptionCountRightLabel(
        categories.map((c) => ({ value: c, label: getCategoryLabel?.(c) ?? String(c) })),
        facetCountMaps?.categoryCounts,
      ),
    [categories, getCategoryLabel, facetCountMaps?.categoryCounts],
  );

  const licenses = useMemo(() => buildCatalogLicenseFacets(facetItems), [facetItems]);

  const licenseOptions = useMemo(() => {
    const present = collectCatalogLicenseKeysFromItems(facetItems);
    return withOptionCountRightLabel(
      buildCatalogLicenseFilterOptions(present),
      facetCountMaps?.licenseCounts,
    );
  }, [facetItems, facetCountMaps?.licenseCounts]);

  const feelings = useMemo(() => buildCatalogFeelingFacets(facetItems), [facetItems]);

  const feelingOptions = useMemo(() => {
    const present = new Set(CATALOG_FEELING_FILTER_ORDER);
    for (const key of feelings) present.add(key as (typeof CATALOG_FEELING_FILTER_ORDER)[number]);
    return withOptionCountRightLabel(
      buildCatalogFeelingFilterOptions(present),
      facetCountMaps?.feelingCounts,
    );
  }, [feelings, facetCountMaps?.feelingCounts]);

  const shapes = useMemo(() => buildCatalogShapeFacets(facetItems), [facetItems]);

  const shapeOptions = useMemo(() => {
    const present = new Set(CATALOG_SHAPE_FILTER_ORDER);
    for (const key of shapes) present.add(key as (typeof CATALOG_SHAPE_FILTER_ORDER)[number]);
    return withOptionCountRightLabel(
      buildCatalogShapeFilterOptions(present),
      facetCountMaps?.shapeCounts,
    );
  }, [shapes, facetCountMaps?.shapeCounts]);

  const calligraphies = useMemo(() => buildCatalogCalligraphyFacets(facetItems), [facetItems]);

  const calligraphyOptions = useMemo(() => {
    const present = new Set<string>();
    for (const key of calligraphies) present.add(key);
    if (facetCountMaps?.calligraphyCounts instanceof Map) {
      for (const key of facetCountMaps.calligraphyCounts.keys()) present.add(String(key));
    }
    return withOptionCountRightLabel(
      buildCatalogCalligraphyFilterOptions(present),
      facetCountMaps?.calligraphyCounts,
    );
  }, [calligraphies, facetCountMaps?.calligraphyCounts]);

  const variableOptions = useMemo(() => {
    const base: CatalogSelectOption[] = [
      { value: 'variable', label: 'Вариативные' },
      { value: 'static', label: 'Статические' },
    ];
    if (!facetCountMaps) return base;
    return base.map((opt) => {
      const n = opt.value === 'variable' ? facetCountMaps.variableCount : facetCountMaps.staticCount;
      return Number.isFinite(n) && n > 0 ? { ...opt, rightLabel: String(n) } : opt;
    });
  }, [facetCountMaps]);

  const subsetOptions = useMemo(
    () =>
      buildGroupedFontSubsetOptions(subsets, controls.filterSubset, {
        includeSelectedSection: false,
        subsetCounts: facetCountMaps?.subsetCounts,
      }),
    [subsets, controls.filterSubset, facetCountMaps?.subsetCounts],
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

      licenseFilterId: ids.licenseFilterId,
      licenseValue: controls.filterLicense,
      onLicenseChange: controls.setFilterLicense,
      licenseOptions,

      feelingFilterId: ids.feelingFilterId,
      feelingValue: controls.filterFeeling,
      onFeelingChange: controls.setFilterFeeling,
      feelingOptions,

      shapeFilterId: ids.shapeFilterId,
      shapeValue: controls.filterShape,
      onShapeChange: controls.setFilterShape,
      shapeOptions,

      calligraphyFilterId: ids.calligraphyFilterId,
      calligraphyValue: controls.filterCalligraphy,
      onCalligraphyChange: controls.setFilterCalligraphy,
      calligraphyOptions,

      variableFilterId: ids.variableFilterId,
      variableValue: controls.filterVariable,
      onVariableChange: controls.setFilterVariable,
      variableOptions,

      subsetFilterId: ids.subsetFilterId,
      subsetValue: controls.filterSubset,
      onSubsetChange: controls.setFilterSubset,
      subsetOptions,

      italicOnly: controls.filterItalicOnly,
      onItalicOnlyChange: controls.setFilterItalicOnly,
      roleFilterId: ids.roleFilterId,
      roleValue: controls.filterRole,
      onRoleChange: controls.setFilterRole,
      roleOptions: [...CATALOG_ROLE_FILTER_OPTIONS],

      sortValue: controls.sortMode,
      onSortChange: controls.setSortMode,
      sortOptions,

      gridViewMode: controls.gridViewMode,
      onGridViewModeChange: controls.setGridViewMode,

      previewSamplePreset: controls.previewSamplePreset,
      onPreviewSamplePresetChange: controls.setPreviewSamplePreset,
      previewCustomText: controls.previewCustomText,
      onPreviewCustomTextChange: controls.setPreviewCustomText,
      previewFontSizePx: controls.previewFontSizePx,
      onPreviewFontSizePxChange: controls.setPreviewFontSizePx,
      previewPresetFilterId: ids.previewPresetFilterId,
      previewCustomTextId: ids.previewCustomTextId,

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
      ids.licenseFilterId,
      ids.feelingFilterId,
      ids.shapeFilterId,
      ids.calligraphyFilterId,
      ids.variableFilterId,
      ids.subsetFilterId,
      controls.searchQuery,
      controls.setSearchQuery,
      controls.setIsSearchFocused,
      controls.isSearchFocused,
      controls.filterCategory,
      controls.setFilterCategory,
      controls.filterLicense,
      controls.setFilterLicense,
      controls.filterFeeling,
      controls.setFilterFeeling,
      controls.filterShape,
      controls.setFilterShape,
      controls.filterCalligraphy,
      controls.setFilterCalligraphy,
      controls.filterVariable,
      controls.setFilterVariable,
      controls.filterSubset,
      controls.setFilterSubset,
      controls.filterItalicOnly,
      controls.setFilterItalicOnly,
      controls.filterRole,
      controls.setFilterRole,
      ids.roleFilterId,
      controls.sortMode,
      controls.setSortMode,
      controls.gridViewMode,
      controls.setGridViewMode,
      controls.previewSamplePreset,
      controls.setPreviewSamplePreset,
      controls.previewCustomText,
      controls.setPreviewCustomText,
      controls.previewFontSizePx,
      controls.setPreviewFontSizePx,
      ids.previewPresetFilterId,
      ids.previewCustomTextId,
      controls.hasActiveFilters,
      controls.clearFilters,
      searchPlaceholder,
      count,
      countSuffix,
      categoryOptions,
      licenseOptions,
      feelingOptions,
      shapeOptions,
      calligraphyOptions,
      subsetOptions,
      variableOptions,
      sortOptions,
      clearFiltersButtonClassName,
    ],
  );

  return { toolbarProps, categories, subsets, subsetOptions, categoryOptions, countSuffix };
}

export type CatalogPanelToolbarPropsFromHook = ReturnType<typeof useCatalogToolbarProps>['toolbarProps'];
