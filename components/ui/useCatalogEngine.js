import { useCallback, useMemo, useRef } from 'react';
import { useCatalogViewControls } from './useCatalogViewControls';
import { useCatalogSessionExclusion } from './useCatalogSessionExclusion';
import { useCatalogToolbarProps } from './useCatalogToolbarProps';

/**
 * "Движок" каталога: controls + filteredSortedItems + itemsNotInSession + toolbarProps.
 * Специфика Google/Fontsource задаётся функциями/параметрами.
 */
export function useCatalogEngine({
  // controls
  controlsConfig,

  // data
  rawItems,
  fonts,
  fontLibraries,
  sourcePrefix,
  getKey,
  isInSession,
  addingKey,
  recentlyAddedSet,

  // pipeline
  exclusionOrder = 'afterFilterSort', // 'beforeFilterSort' | 'afterFilterSort'
  filterSortItems, // (items, controls) => filteredSortedItems

  // toolbar
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
    facetItemsResolver, // ({ rawItems, filteredSortedItems, itemsNotInSession }) => facetItems
    getCategory,
    getSubsets,
    compareCategory,
    compareSubset,
    getCategoryLabel,
    countsResolver, // ({ filteredSortedItems, itemsNotInSession }) => { count, countTotal }
  },
}) {
  const controls = useCatalogViewControls(controlsConfig);

  const rawList = Array.isArray(rawItems) ? rawItems : [];
  const filterSortItemsRef = useRef(filterSortItems);
  filterSortItemsRef.current = filterSortItems;

  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const isInSessionRef = useRef(isInSession);
  isInSessionRef.current = isInSession;

  // Важно: панели (особенно Fontsource) могут часто перерисовываться из-за чанков/превью.
  // Если они передают inline-функции/объекты в config, это инвалидирует useMemo в тулбаре и создаёт лаги.
  // Поэтому стабилизируем резолверы через refs + стабильные обёртки.
  const facetItemsResolverRef = useRef(facetItemsResolver);
  facetItemsResolverRef.current = facetItemsResolver;
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

  const stableGetCategory = useCallback((item) => getCategoryRef.current?.(item), []);
  const stableGetSubsets = useCallback((item) => getSubsetsRef.current?.(item), []);
  const stableCompareCategory = useCallback((a, b) => compareCategoryRef.current?.(a, b) ?? 0, []);
  const stableCompareSubset = useCallback((a, b) => compareSubsetRef.current?.(a, b) ?? 0, []);
  const stableGetCategoryLabel = useCallback((c) => getCategoryLabelRef.current?.(c), []);
  const stableGetKey = useCallback((item) => getKeyRef.current?.(item), []);
  const stableIsInSession = useCallback((fontsState, key) => isInSessionRef.current?.(fontsState, key), []);

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

  const filterBase =
    exclusionOrder === 'beforeFilterSort' ? itemsNotInSessionBefore : rawList;

  const filteredSortedItems = useMemo(() => {
    const fn = filterSortItemsRef.current;
    if (typeof fn !== 'function') return Array.isArray(filterBase) ? filterBase : [];
    return fn(filterBase, controls);
  }, [
    filterBase,
    controls.searchQuery,
    controls.searchQueryTrimmed,
    controls.sortMode,
    controls.filterCategory,
    controls.filterSubset,
    controls.filterVariable,
    controls.filterItalicOnly,
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
