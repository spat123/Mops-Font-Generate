import { compareFontFamilyName } from './fontSort';
import { matchesCatalogFontSearch, scoreCatalogFontSearch } from './searchMatching';

/** @param {Set<string>|string[]|null|undefined} preserveKeys */
export function normalizePreserveKeysSet(preserveKeys) {
  if (preserveKeys instanceof Set) return preserveKeys;
  if (!Array.isArray(preserveKeys)) return null;
  const out = new Set();
  for (const key of preserveKeys) {
    const k = String(key || '').trim();
    if (k) out.add(k);
  }
  return out.size > 0 ? out : null;
}

export function buildCatalogFacets(items, { getCategory, getSubsets, compareCategory, compareSubset }) {
  const categories = new Set();
  const subsets = new Set();
  const list = Array.isArray(items) ? items : [];

  for (const item of list) {
    const c = getCategory?.(item);
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

export function filterCatalogItems(
  items,
  {
    searchQuery = '',
    getSearchTokens,
    filterCategory = '',
    getCategory,
    filterSubset = [],
    getSubsets,
    filterVariable = 'all',
    isVariable,
    filterItalicOnly = false,
    hasItalic,
    preserveKeys = null,
    getPreserveKey = null,
  },
) {
  const list = Array.isArray(items) ? items : [];
  const subsetFilter = Array.isArray(filterSubset) ? filterSubset : [];
  const useSearch = String(searchQuery || '').trim().length > 0;
  const preserveSet = normalizePreserveKeysSet(preserveKeys);

  const out = [];
  for (const item of list) {
    if (filterCategory) {
      const c = getCategory?.(item);
      if ((c || '') !== filterCategory) continue;
    }

    if (subsetFilter.length > 0) {
      const subs = Array.isArray(getSubsets?.(item)) ? getSubsets(item) : [];
      let ok = false;
      for (const s of subsetFilter) {
        if (subs.includes(s)) {
          ok = true;
          break;
        }
      }
      if (!ok) continue;
    }

    if (filterVariable === 'variable' && !Boolean(isVariable?.(item))) continue;
    if (filterVariable === 'static' && Boolean(isVariable?.(item))) continue;
    if (filterItalicOnly && !Boolean(hasItalic?.(item))) continue;

    if (useSearch) {
      const pinKey =
        preserveSet && typeof getPreserveKey === 'function'
          ? String(getPreserveKey(item) || '').trim()
          : '';
      const pinned = pinKey && preserveSet.has(pinKey);
      if (!pinned) {
        const tokens = Array.isArray(getSearchTokens?.(item)) ? getSearchTokens(item) : [];
        if (!matchesCatalogFontSearch(tokens, searchQuery)) continue;
      }
    }

    out.push(item);
  }

  return out;
}

export function sortCatalogItems(items, sortMode, sorters, fallbackSorter) {
  const arr = Array.isArray(items) ? [...items] : [];
  const sorter =
    (sorters && typeof sorters === 'object' && typeof sorters[sortMode] === 'function'
      ? sorters[sortMode]
      : null) || fallbackSorter;
  if (typeof sorter === 'function') arr.sort(sorter);
  return arr;
}

export function sortCatalogItemsBySearchRelevance(items, searchQuery, getSearchTokens) {
  const q = String(searchQuery || '').trim();
  if (!q) return Array.isArray(items) ? [...items] : [];
  const arr = Array.isArray(items) ? items : [];
  return [...arr]
    .map((item) => ({
      item,
      score: scoreCatalogFontSearch(
        Array.isArray(getSearchTokens?.(item)) ? getSearchTokens(item) : [],
        q,
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

export function filterSortCatalogItems(items, filterOpts, sortMode, sorters, fallbackSorter) {
  const filtered = filterCatalogItems(items, filterOpts);
  const q = String(filterOpts?.searchQuery || '').trim();
  if (q) {
    return sortCatalogItemsBySearchRelevance(filtered, q, filterOpts?.getSearchTokens);
  }
  return sortCatalogItems(filtered, sortMode, sorters, fallbackSorter);
}

