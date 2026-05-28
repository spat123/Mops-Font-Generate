import { GOOGLE_CALLIGRAPHY_TAG_RULES } from './googleFontFamilyTags';
import { canonicalFontCategoryKey } from './fontCategoryLabels';
import type { CatalogSearchableItem } from '../types/catalog';

export const CATALOG_CALLIGRAPHY_FILTER_ORDER = ['handwritten', 'formal', 'informal', 'upright'] as const;

export const CATALOG_CALLIGRAPHY_LABELS_RU: Record<string, string> = {
  handwritten: 'Рукописные',
  formal: 'Формальные',
  informal: 'Неформальные',
  upright: 'Прямые',
};

export function getCatalogItemCalligraphyKeys(item: CatalogSearchableItem | null | undefined): string[] {
  if (Array.isArray(item?.calligraphy) && item.calligraphy.length > 0) {
    return item.calligraphy as string[];
  }
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const keys = new Set<string>();
  for (const s of sources) {
    const raw = s?.raw as { calligraphy?: string[]; category?: string } | undefined;
    const list = Array.isArray(raw?.calligraphy) ? raw.calligraphy : [];
    for (const key of list) {
      const k = String(key || '').trim();
      if (k) keys.add(k);
    }
    if (keys.size === 0 && canonicalFontCategoryKey(raw?.category) === 'handwriting') {
      keys.add('handwritten');
    }
  }
  return CATALOG_CALLIGRAPHY_FILTER_ORDER.filter((k) => keys.has(k));
}

export function itemMatchesCatalogCalligraphyFilter(
  item: CatalogSearchableItem,
  filterCalligraphy: string,
): boolean {
  const filter = String(filterCalligraphy || '').trim();
  if (!filter) return true;
  return getCatalogItemCalligraphyKeys(item).includes(filter);
}

export function collectCatalogCalligraphyKeysFromItems(items: CatalogSearchableItem[]): Set<string> {
  const set = new Set<string>();
  for (const item of Array.isArray(items) ? items : []) {
    for (const key of getCatalogItemCalligraphyKeys(item)) {
      set.add(key);
    }
  }
  return set;
}

export function buildCatalogCalligraphyFilterOptions(calligraphyKeysSet: Set<string>) {
  const present = calligraphyKeysSet instanceof Set ? calligraphyKeysSet : new Set<string>();
  return CATALOG_CALLIGRAPHY_FILTER_ORDER.filter((key) => present.has(key)).map((value) => ({
    value,
    label: CATALOG_CALLIGRAPHY_LABELS_RU[value] || value,
  }));
}

export function compareCatalogCalligraphyLabels(a: string, b: string): number {
  const ia = CATALOG_CALLIGRAPHY_FILTER_ORDER.indexOf(a as (typeof CATALOG_CALLIGRAPHY_FILTER_ORDER)[number]);
  const ib = CATALOG_CALLIGRAPHY_FILTER_ORDER.indexOf(b as (typeof CATALOG_CALLIGRAPHY_FILTER_ORDER)[number]);
  const ra = ia >= 0 ? ia : 999;
  const rb = ib >= 0 ? ib : 999;
  if (ra !== rb) return ra - rb;
  return String(a).localeCompare(String(b), 'ru', { sensitivity: 'base' });
}

export function buildCatalogCalligraphyFacets(items: CatalogSearchableItem[]): string[] {
  const keys = collectCatalogCalligraphyKeysFromItems(items);
  return CATALOG_CALLIGRAPHY_FILTER_ORDER.filter((k) => keys.has(k));
}

export function getCatalogCalligraphyLabelRu(key: string): string {
  return CATALOG_CALLIGRAPHY_LABELS_RU[key] || String(key || '').trim();
}

export function getCatalogCalligraphyGoogleTags(calligraphyKey: string): string[] {
  return (GOOGLE_CALLIGRAPHY_TAG_RULES as Record<string, string[]>)[calligraphyKey] || [];
}
