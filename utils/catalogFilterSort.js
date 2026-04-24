import { matchesSearch } from './searchMatching';

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
  },
) {
  const list = Array.isArray(items) ? items : [];
  const subsetFilter = Array.isArray(filterSubset) ? filterSubset : [];
  const useSearch = String(searchQuery || '').trim().length > 0;

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
      const tokens = Array.isArray(getSearchTokens?.(item)) ? getSearchTokens(item) : [];
      if (!matchesSearch(tokens, searchQuery)) continue;
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

export function filterSortCatalogItems(items, filterOpts, sortMode, sorters, fallbackSorter) {
  const filtered = filterCatalogItems(items, filterOpts);
  return sortCatalogItems(filtered, sortMode, sorters, fallbackSorter);
}

