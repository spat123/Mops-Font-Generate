import { useCallback, useMemo, useRef, type ReactNode, type Ref } from 'react';
import { useCatalogViewControls, type CatalogViewControls, type UseCatalogViewControlsConfig } from './useCatalogViewControls';
import { useCatalogSessionExclusion } from './useCatalogSessionExclusion';
import { useCatalogToolbarProps, type CatalogToolbarIds } from './useCatalogToolbarProps';
import type { CatalogFilterOptions, CatalogSearchableItem, CatalogSortOption } from '../../types/catalog';
import type { SavedLibraryRecord, SessionFontRecord } from '../../types/editorFonts';

export type CatalogExclusionOrder = 'beforeFilterSort' | 'afterFilterSort';

export type CatalogEngineToolbarConfig<T extends CatalogSearchableItem> = {
  trailingToolbar?: ReactNode;
  trailingContainerRef?: Ref<HTMLDivElement> | null;
  viewportW?: number;
  toolbarAlignToGrid?: boolean;
  oneCardWidthPx?: number | null;
  ids: CatalogToolbarIds;
  searchPlaceholder?: string;
  sortOptions?: CatalogSortOption[];
  clearFiltersButtonClassName?: string;
  facetItemsResolver?: (ctx: {
    rawItems: T[];
    filteredSortedItems: T[];
    itemsNotInSession: T[];
  }) => T[];
  facetCountItemsResolver?: (ctx: {
    rawItems: T[];
    filterBase: T[];
    filteredSortedItems: T[];
    itemsNotInSession: T[];
  }) => T[];
  facetCountConfig?: CatalogFilterOptions<T>;
  getCategory?: (item: T) => string | undefined;
  getSubsets?: (item: T) => string[] | undefined;
  compareCategory?: (a: string, b: string) => number;
  compareSubset?: (a: string, b: string) => number;
  getCategoryLabel?: (category: string) => string;
  countsResolver?: (ctx: { filteredSortedItems: T[]; itemsNotInSession: T[] }) => {
    count: number;
    countTotal: number;
  };
};

export type UseCatalogEngineParams<T extends CatalogSearchableItem = CatalogSearchableItem> = {
  controlsConfig?: UseCatalogViewControlsConfig;
  rawItems: T[];
  fonts: SessionFontRecord[];
  fontLibraries: SavedLibraryRecord[];
  sourcePrefix: string;
  getKey?: (item: T) => string | null | undefined;
  isInSession?: (fonts: SessionFontRecord[], key: string) => boolean;
  addingKey?: string | null;
  recentlyAddedSet?: Set<string> | null;
  exclusionOrder?: CatalogExclusionOrder;
  filterSortItems?: (items: T[], controls: CatalogViewControls) => T[];
  filterPreserveKeys?: Set<string> | string[] | null;
  toolbar: CatalogEngineToolbarConfig<T>;
};

/**
 * "Движок" каталога: controls + filteredSortedItems + itemsNotInSession + toolbarProps.
 */
export function useCatalogEngine<T extends CatalogSearchableItem = CatalogSearchableItem>({
  controlsConfig,
  rawItems,
  fonts,
  fontLibraries,
  sourcePrefix,
  getKey,
  isInSession,
  addingKey,
  recentlyAddedSet,
  exclusionOrder = 'afterFilterSort',
  filterSortItems,
  filterPreserveKeys = null,
  toolbar: {
    trailingToolbar,
    trailingContainerRef,
    viewportW,
    toolbarAlignToGrid,
    oneCardWidthPx,
    ids,
    searchPlaceholder,
    sortOptions,
    clearFiltersButtonClassName,
    facetItemsResolver,
    facetCountItemsResolver,
    facetCountConfig,
    getCategory,
    getSubsets,
    compareCategory,
    compareSubset,
    getCategoryLabel,
    countsResolver,
  },
}: UseCatalogEngineParams<T>) {
  const controls = useCatalogViewControls(controlsConfig);

  const rawList = Array.isArray(rawItems) ? rawItems : [];
  const filterSortItemsRef = useRef(filterSortItems);
  filterSortItemsRef.current = filterSortItems;

  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const isInSessionRef = useRef(isInSession);
  isInSessionRef.current = isInSession;

  const facetItemsResolverRef = useRef(facetItemsResolver);
  facetItemsResolverRef.current = facetItemsResolver;
  const facetCountItemsResolverRef = useRef(facetCountItemsResolver);
  facetCountItemsResolverRef.current = facetCountItemsResolver;
  const facetCountConfigRef = useRef(facetCountConfig);
  facetCountConfigRef.current = facetCountConfig;
  const countsResolverRef = useRef(countsResolver);
  countsResolverRef.current = countsResolver;
  const getCategoryRef = useRef(getCategory);
  getCategoryRef.current = getCategory;
  const getSubsetsRef = useRef(getSubsets);
  getSubsetsRef.current = getSubsets;
  const compareCategoryRef = useRef(compareCategory);
  compareCategoryRef.current = compareCategory;
  const compareSubsetRef = useRef(compareSubset);
  compareSubsetRef.current = compareSubset;
  const getCategoryLabelRef = useRef(getCategoryLabel);
  getCategoryLabelRef.current = getCategoryLabel;

  const stableGetCategory = useCallback((item: T) => getCategoryRef.current?.(item), []);
  const stableGetSubsets = useCallback((item: T) => getSubsetsRef.current?.(item), []);
  const stableCompareCategory = useCallback((a: string, b: string) => compareCategoryRef.current?.(a, b) ?? 0, []);
  const stableCompareSubset = useCallback((a: string, b: string) => compareSubsetRef.current?.(a, b) ?? 0, []);
  const stableGetCategoryLabel = useCallback((c: string) => getCategoryLabelRef.current?.(c), []);
  const stableGetKey = useCallback((item: T) => getKeyRef.current?.(item), []);
  const stableIsInSession = useCallback(
    (fontsState: SessionFontRecord[], key: string) => isInSessionRef.current?.(fontsState, key),
    [],
  );

  const itemsNotInSessionBefore = useCatalogSessionExclusion({
    items: exclusionOrder === 'beforeFilterSort' ? rawList : [],
    fonts,
    fontLibraries,
    sourcePrefix,
    getKey: stableGetKey,
    isInSession: stableIsInSession,
    addingKey,
    recentlyAddedSet,
  }).itemsNotInSession;

  const filterBase = exclusionOrder === 'beforeFilterSort' ? itemsNotInSessionBefore : rawList;

  const filteredSortedItems = useMemo(() => {
    const fn = filterSortItemsRef.current;
    if (typeof fn !== 'function') return Array.isArray(filterBase) ? filterBase : [];
    return fn(filterBase, controls);
  }, [
    filterBase,
    controls.searchQueryDebouncedTrimmed,
    controls.sortMode,
    controls.filterCategory,
    controls.filterSubset,
    controls.filterVariable,
    controls.filterLicense,
    controls.filterFeeling,
    controls.filterShape,
    controls.filterCalligraphy,
    controls.filterItalicOnly,
    controls.filterRole,
    filterPreserveKeys,
  ]);

  const itemsNotInSessionAfter = useCatalogSessionExclusion({
    items: exclusionOrder === 'afterFilterSort' ? filteredSortedItems : [],
    fonts,
    fontLibraries,
    sourcePrefix,
    getKey: stableGetKey,
    isInSession: stableIsInSession,
    addingKey,
    recentlyAddedSet,
  }).itemsNotInSession;

  const itemsNotInSession =
    exclusionOrder === 'beforeFilterSort' ? itemsNotInSessionBefore : itemsNotInSessionAfter;

  const facetItems = useMemo(() => {
    const resolver = facetItemsResolverRef.current;
    if (typeof resolver === 'function') {
      return resolver({ rawItems: rawList, filteredSortedItems, itemsNotInSession });
    }
    return rawList;
  }, [rawList, filteredSortedItems, itemsNotInSession]);

  const facetCountItems = useMemo(() => {
    const resolver = facetCountItemsResolverRef.current;
    if (typeof resolver === 'function') {
      return resolver({ rawItems: rawList, filterBase, filteredSortedItems, itemsNotInSession });
    }
    return filterBase;
  }, [rawList, filterBase, filteredSortedItems, itemsNotInSession]);

  const counts = useMemo(() => {
    const resolver = countsResolverRef.current;
    if (typeof resolver === 'function') {
      return resolver({ filteredSortedItems, itemsNotInSession });
    }
    return { count: filteredSortedItems.length, countTotal: filteredSortedItems.length };
  }, [filteredSortedItems.length, itemsNotInSession.length]);

  const { toolbarProps } = useCatalogToolbarProps({
    trailingToolbar,
    trailingContainerRef,
    viewportW,
    toolbarAlignToGrid,
    oneCardWidthPx,
    ids,
    controls,
    searchPlaceholder,
    count: counts.count,
    countTotal: counts.countTotal,
    sortOptions,
    clearFiltersButtonClassName,
    facetItems,
    facetCountItems,
    facetCountConfig: facetCountConfigRef.current,
    filterPreserveKeys,
    getCategory: stableGetCategory,
    getSubsets: stableGetSubsets,
    compareCategory: stableCompareCategory,
    compareSubset: stableCompareSubset,
    getCategoryLabel: stableGetCategoryLabel,
  });

  return {
    controls,
    filteredSortedItems,
    itemsNotInSession,
    toolbarProps,
  };
}
