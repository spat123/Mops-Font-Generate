import { getFontCategoryLabelRu } from './fontCategoryLabels';
import { getCatalogFeelingLabelRu } from './catalogFeelingFilter';
import { getCatalogShapeLabelRu } from './catalogShapeFilter';
import { getFontSubsetLabelRu } from './fontSubsetLabels';
import { buildSearchVariants } from './searchMatching';
import type { CatalogSearchableItem } from '../types/catalog';

export function buildUnifiedCatalogSearchTokens(item: CatalogSearchableItem | null | undefined): string[] {
  if (!item || typeof item !== 'object') return [];
  if (Array.isArray(item.searchTokens) && item.searchTokens.length > 0) {
    return item.searchTokens;
  }
  return [
    item.displayName,
    item.category,
    getFontCategoryLabelRu(item.category),
    ...(Array.isArray(item.feelings) ? item.feelings.map(getCatalogFeelingLabelRu) : []),
    ...(Array.isArray(item.shapes) ? item.shapes.map(getCatalogShapeLabelRu) : []),
    ...(Array.isArray(item.subsets) ? item.subsets : []),
    ...(Array.isArray(item.subsets) ? item.subsets : []).map((subset) => getFontSubsetLabelRu(subset)),
  ].filter((token): token is string => token != null && String(token).length > 0);
}

export function attachUnifiedCatalogSearchIndex<T extends CatalogSearchableItem>(item: T): T & {
  searchTokens: string[];
  searchFamilyVariants: string[];
} {
  const displayName = String(item.displayName || '').trim();
  return {
    ...item,
    searchTokens: buildUnifiedCatalogSearchTokens(item),
    searchFamilyVariants: buildSearchVariants(displayName),
  };
}

export function getCatalogItemSearchTokens(
  item: CatalogSearchableItem | null | undefined,
  getSearchTokens?: (item: CatalogSearchableItem) => string[],
): string[] {
  if (Array.isArray(item?.searchTokens) && item.searchTokens.length > 0) {
    return item.searchTokens;
  }
  if (typeof getSearchTokens === 'function') {
    const tokens = getSearchTokens(item!);
    return Array.isArray(tokens) ? tokens : [];
  }
  return buildUnifiedCatalogSearchTokens(item);
}
