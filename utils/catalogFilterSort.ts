import { compareFontFamilyName } from './fontSort';
import { canonicalFontCategoryKey } from './fontCategoryLabels';
import { catalogItemMatchesRoleFilter } from './catalogRoleFilter';
import { getCatalogItemSearchTokens } from './catalogSearchTokens';
import {
  matchesCatalogFontSearch,
  prepareCatalogSearchQuery,
  scoreCatalogFontSearch,
} from './searchMatching';
import type {
  CatalogFilterOmitKey,
  CatalogFilterOptions,
  CatalogSearchableItem,
  CatalogSelectOption,
} from '../types/catalog';

export function normalizePreserveKeysSet(
  preserveKeys: Set<string> | string[] | null | undefined,
): Set<string> | null {
  if (preserveKeys instanceof Set) return preserveKeys;
  if (!Array.isArray(preserveKeys)) return null;
  const out = new Set<string>();
  for (const key of preserveKeys) {
    const k = String(key || '').trim();
    if (k) out.add(k);
  }
  return out.size > 0 ? out : null;
}

export function buildCatalogFacets<T>(
  items: T[],
  {
    getCategory,
    getSubsets,
    compareCategory,
    compareSubset,
  }: {
    getCategory?: (item: T) => string | undefined;
    getSubsets?: (item: T) => string[] | undefined;
    compareCategory?: (a: string, b: string) => number;
    compareSubset?: (a: string, b: string) => number;
  },
): { categories: string[]; subsets: string[] } {
  const categories = new Set<string>();
  const subsets = new Set<string>();
  const list = Array.isArray(items) ? items : [];

  for (const item of list) {
    const c = canonicalFontCategoryKey(getCategory?.(item));
    if (c) categories.add(c);
    const subs = getSubsets?.(item);
    if (Array.isArray(subs)) {
      for (const s of subs) {
        if (s) subsets.add(s);
      }
    }
  }

  const outCategories = Array.from(categories);
  const outSubsets = Array.from(subsets);

  if (typeof compareCategory === 'function') outCategories.sort(compareCategory);
  if (typeof compareSubset === 'function') outSubsets.sort(compareSubset);

  return { categories: outCategories, subsets: outSubsets };
}

export function itemMatchesCatalogFilters<T extends CatalogSearchableItem>(
  item: T,
  {
    searchQuery = '',
    searchPrepared = null,
    getSearchTokens,
    filterCategory = '',
    getCategory,
    filterSubset = [],
    getSubsets,
    filterVariable = 'all',
    isVariable,
    filterItalicOnly = false,
    hasItalic,
    filterLicense = '',
    getLicenseKeys = null,
    filterFeeling = '',
    getFeelingKeys = null,
    filterShape = '',
    getShapeKeys = null,
    filterCalligraphy = '',
    getCalligraphyKeys = null,
    filterRole = '',
    preserveKeys = null,
    getPreserveKey = null,
  }: CatalogFilterOptions<T>,
  { omit = [] }: { omit?: CatalogFilterOmitKey[] } = {},
): boolean {
  const skip = new Set(Array.isArray(omit) ? omit : []);
  const subsetFilter = Array.isArray(filterSubset) ? filterSubset : [];
  const useSearch = String(searchQuery || '').trim().length > 0;
  const preserveSet = normalizePreserveKeysSet(preserveKeys);

  if (!skip.has('category') && filterCategory) {
    const c = canonicalFontCategoryKey(getCategory?.(item));
    if (c !== filterCategory) return false;
  }

  if (!skip.has('subset') && subsetFilter.length > 0) {
    const subs = Array.isArray(getSubsets?.(item)) ? getSubsets(item)! : [];
    let ok = false;
    for (const s of subsetFilter) {
      if (subs.includes(s)) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }

  if (!skip.has('variable')) {
    if (filterVariable === 'variable' && !isVariable?.(item)) return false;
    if (filterVariable === 'static' && isVariable?.(item)) return false;
  }

  if (!skip.has('italic') && filterItalicOnly && !hasItalic?.(item)) return false;

  if (!skip.has('license') && filterLicense) {
    const keys = typeof getLicenseKeys === 'function' ? getLicenseKeys(item) : [];
    const licenseList = Array.isArray(keys) ? keys : [];
    if (!licenseList.includes(filterLicense)) return false;
  }

  if (!skip.has('feeling') && filterFeeling) {
    const keys = typeof getFeelingKeys === 'function' ? getFeelingKeys(item) : [];
    const feelingList = Array.isArray(keys) ? keys : [];
    if (!feelingList.includes(filterFeeling)) return false;
  }

  if (!skip.has('shape') && filterShape) {
    const keys = typeof getShapeKeys === 'function' ? getShapeKeys(item) : [];
    const shapeList = Array.isArray(keys) ? keys : [];
    if (!shapeList.includes(filterShape)) return false;
  }

  if (!skip.has('calligraphy') && filterCalligraphy) {
    const keys = typeof getCalligraphyKeys === 'function' ? getCalligraphyKeys(item) : [];
    const calligraphyList = Array.isArray(keys) ? keys : [];
    if (!calligraphyList.includes(filterCalligraphy)) return false;
  }

  if (!skip.has('role')) {
    if (
      !catalogItemMatchesRoleFilter(item, {
        filterRole,
        getCategory,
      })
    ) {
      return false;
    }
  }

  if (!skip.has('search') && useSearch) {
    const pinKey =
      preserveSet && typeof getPreserveKey === 'function'
        ? String(getPreserveKey(item) || '').trim()
        : '';
    const pinned = Boolean(pinKey && preserveSet.has(pinKey));
    if (!pinned) {
      const tokens = getCatalogItemSearchTokens(item, getSearchTokens);
      const familyVariants = Array.isArray(item?.searchFamilyVariants) ? item.searchFamilyVariants : null;
      const prepared = searchPrepared ?? prepareCatalogSearchQuery(searchQuery);
      if (!matchesCatalogFontSearch(tokens, searchQuery, prepared, familyVariants)) return false;
    }
  }

  return true;
}

function bumpCount(map: Map<string, number>, key: unknown): void {
  const k = String(key || '').trim();
  if (!k) return;
  map.set(k, (map.get(k) || 0) + 1);
}

export function buildCatalogFacetCountMaps<T extends CatalogSearchableItem>(
  items: T[],
  filterOpts: CatalogFilterOptions<T>,
) {
  const list = Array.isArray(items) ? items : [];
  const categoryCounts = new Map<string, number>();
  const licenseCounts = new Map<string, number>();
  const feelingCounts = new Map<string, number>();
  const shapeCounts = new Map<string, number>();
  const subsetCounts = new Map<string, number>();
  const calligraphyCounts = new Map<string, number>();
  let variableCount = 0;
  let staticCount = 0;

  const searchQuery = String(filterOpts?.searchQuery || '').trim();
  const searchPrepared =
    filterOpts?.searchPrepared ?? (searchQuery ? prepareCatalogSearchQuery(searchQuery) : null);
  const useSearch = Boolean(searchPrepared && !searchPrepared.empty);
  const preserveSet = normalizePreserveKeysSet(filterOpts.preserveKeys);
  const getSearchTokens = filterOpts?.getSearchTokens;
  const getPreserveKey = filterOpts?.getPreserveKey;

  for (const item of list) {
    if (useSearch) {
      const pinKey =
        preserveSet && typeof getPreserveKey === 'function'
          ? String(getPreserveKey(item) || '').trim()
          : '';
      const pinned = Boolean(pinKey && preserveSet.has(pinKey));
      if (!pinned) {
        const tokens = getCatalogItemSearchTokens(item, getSearchTokens);
        const familyVariants = Array.isArray(item?.searchFamilyVariants) ? item.searchFamilyVariants : null;
        if (!matchesCatalogFontSearch(tokens, searchQuery, searchPrepared, familyVariants)) continue;
      }
    }

    if (itemMatchesCatalogFilters(item, filterOpts, { omit: ['category', 'search'] })) {
      bumpCount(categoryCounts, canonicalFontCategoryKey(filterOpts.getCategory?.(item)));
    }
    if (itemMatchesCatalogFilters(item, filterOpts, { omit: ['license', 'search'] })) {
      const keys = typeof filterOpts.getLicenseKeys === 'function' ? filterOpts.getLicenseKeys(item) : [];
      for (const key of Array.isArray(keys) ? keys : []) bumpCount(licenseCounts, key);
    }
    if (itemMatchesCatalogFilters(item, filterOpts, { omit: ['feeling', 'search'] })) {
      const keys = typeof filterOpts.getFeelingKeys === 'function' ? filterOpts.getFeelingKeys(item) : [];
      for (const key of Array.isArray(keys) ? keys : []) bumpCount(feelingCounts, key);
    }
    if (itemMatchesCatalogFilters(item, filterOpts, { omit: ['shape', 'search'] })) {
      const keys = typeof filterOpts.getShapeKeys === 'function' ? filterOpts.getShapeKeys(item) : [];
      for (const key of Array.isArray(keys) ? keys : []) bumpCount(shapeCounts, key);
    }
    if (itemMatchesCatalogFilters(item, filterOpts, { omit: ['calligraphy', 'search'] })) {
      const keys =
        typeof filterOpts.getCalligraphyKeys === 'function' ? filterOpts.getCalligraphyKeys(item) : [];
      for (const key of Array.isArray(keys) ? keys : []) bumpCount(calligraphyCounts, key);
    }
    if (itemMatchesCatalogFilters(item, filterOpts, { omit: ['subset', 'search'] })) {
      const subs = Array.isArray(filterOpts.getSubsets?.(item)) ? filterOpts.getSubsets(item)! : [];
      for (const sub of subs) bumpCount(subsetCounts, sub);
    }
    if (itemMatchesCatalogFilters(item, filterOpts, { omit: ['variable', 'search'] })) {
      if (filterOpts.isVariable?.(item)) variableCount += 1;
      else staticCount += 1;
    }
  }

  return {
    categoryCounts,
    licenseCounts,
    feelingCounts,
    shapeCounts,
    calligraphyCounts,
    subsetCounts,
    variableCount,
    staticCount,
  };
}

export function withOptionCountRightLabel(
  options: CatalogSelectOption[],
  countMap: Map<string, number> | null | undefined,
): CatalogSelectOption[] {
  if (!(countMap instanceof Map)) return options;
  return (Array.isArray(options) ? options : []).map((opt) => {
    if (opt?.kind === 'section') return opt;
    const n = countMap.get(String(opt.value));
    if (!Number.isFinite(n) || n! <= 0) return opt;
    return { ...opt, rightLabel: String(n) };
  });
}

export function filterCatalogItems<T extends CatalogSearchableItem>(
  items: T[],
  filterOpts: CatalogFilterOptions<T>,
): T[] {
  const list = Array.isArray(items) ? items : [];
  const searchQuery = String(filterOpts?.searchQuery || '').trim();
  const searchPrepared =
    filterOpts?.searchPrepared ?? (searchQuery ? prepareCatalogSearchQuery(searchQuery) : null);
  const resolvedOpts = searchPrepared ? { ...filterOpts, searchPrepared } : filterOpts;
  const out: T[] = [];
  for (const item of list) {
    if (itemMatchesCatalogFilters(item, resolvedOpts)) out.push(item);
  }
  return out;
}

export function sortCatalogItems<T>(
  items: T[],
  sortMode: string,
  sorters: Record<string, (a: T, b: T) => number> | null | undefined,
  fallbackSorter?: (a: T, b: T) => number,
): T[] {
  const arr = Array.isArray(items) ? [...items] : [];
  const sorter =
    (sorters && typeof sorters === 'object' && typeof sorters[sortMode] === 'function'
      ? sorters[sortMode]
      : null) || fallbackSorter;
  if (typeof sorter === 'function') arr.sort(sorter);
  return arr;
}

export function sortCatalogItemsBySearchRelevance<T extends CatalogSearchableItem>(
  items: T[],
  searchQuery: string,
  getSearchTokens?: (item: T) => string[],
): T[] {
  const q = String(searchQuery || '').trim();
  if (!q) return Array.isArray(items) ? [...items] : [];
  const prepared = prepareCatalogSearchQuery(q);
  const arr = Array.isArray(items) ? items : [];
  return [...arr]
    .map((item) => ({
      item,
      score: scoreCatalogFontSearch(
        getCatalogItemSearchTokens(item, getSearchTokens),
        q,
        prepared,
        Array.isArray(item?.searchFamilyVariants) ? item.searchFamilyVariants : null,
      ),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const fa = String(a.item?.family || a.item?.label || '');
      const fb = String(b.item?.family || b.item?.label || '');
      return compareFontFamilyName(fa, fb);
    })
    .map((row) => row.item);
}

export function filterSortCatalogItems<T extends CatalogSearchableItem>(
  items: T[],
  filterOpts: CatalogFilterOptions<T>,
  sortMode: string,
  sorters: Record<string, (a: T, b: T) => number> | null | undefined,
  fallbackSorter?: (a: T, b: T) => number,
): T[] {
  const filtered = filterCatalogItems(items, filterOpts);
  const q = String(filterOpts?.searchQuery || '').trim();
  if (q) {
    return sortCatalogItemsBySearchRelevance(filtered, q, filterOpts?.getSearchTokens);
  }
  return sortCatalogItems(filtered, sortMode, sorters, fallbackSorter);
}
