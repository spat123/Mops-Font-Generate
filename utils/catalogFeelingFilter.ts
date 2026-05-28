import { GOOGLE_FEELING_ORDER } from './googleFontFamilyTags';
import type { CatalogSearchableItem } from '../types/catalog';

export const CATALOG_FEELING_FILTER_ORDER = GOOGLE_FEELING_ORDER;

export const CATALOG_FEELING_LABELS_RU: Record<string, string> = {
  Active: 'Активный',
  Artistic: 'Художественный',
  Awkward: 'Неуклюжий',
  Business: 'Деловой',
  Calm: 'Спокойный',
  Childlike: 'Детский',
  Competent: 'Уверенный',
  Cute: 'Милый',
  Excited: 'Воодушевлённый',
  Fancy: 'Изысканный',
  Futuristic: 'Футуристичный',
  Happy: 'Радостный',
  Innovative: 'Инновационный',
  Loud: 'Яркий',
  Playful: 'Игривый',
  Rugged: 'Грубый',
  Sincere: 'Искренний',
  Sophisticated: 'Утончённый',
  Stiff: 'Жёсткий',
  Vintage: 'Винтажный',
};

export function getCatalogItemFeelingKeys(item: CatalogSearchableItem | null | undefined): string[] {
  if (Array.isArray(item?.feelings) && item.feelings.length > 0) {
    return item.feelings;
  }
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const keys = new Set<string>();
  for (const s of sources) {
    const raw = s?.raw as { feelings?: string[] } | undefined;
    const list = Array.isArray(raw?.feelings) ? raw.feelings : [];
    for (const f of list) {
      const k = String(f || '').trim();
      if (k) keys.add(k);
    }
  }
  return CATALOG_FEELING_FILTER_ORDER.filter((k) => keys.has(k));
}

export function itemMatchesCatalogFeelingFilter(
  item: CatalogSearchableItem,
  filterFeeling: string,
): boolean {
  const filter = String(filterFeeling || '').trim();
  if (!filter) return true;
  return getCatalogItemFeelingKeys(item).includes(filter);
}

export function collectCatalogFeelingKeysFromItems(items: CatalogSearchableItem[]): Set<string> {
  const set = new Set<string>();
  for (const item of Array.isArray(items) ? items : []) {
    for (const key of getCatalogItemFeelingKeys(item)) {
      set.add(key);
    }
  }
  return set;
}

export function buildCatalogFeelingFilterOptions(feelingKeysSet: Set<string>) {
  const present = feelingKeysSet instanceof Set ? feelingKeysSet : new Set<string>();
  return CATALOG_FEELING_FILTER_ORDER.filter((key) => present.has(key)).map((value) => ({
    value,
    label: CATALOG_FEELING_LABELS_RU[value] || value,
  }));
}

export function compareCatalogFeelingLabels(a: string, b: string): number {
  const ia = CATALOG_FEELING_FILTER_ORDER.indexOf(a);
  const ib = CATALOG_FEELING_FILTER_ORDER.indexOf(b);
  const ra = ia >= 0 ? ia : 999;
  const rb = ib >= 0 ? ib : 999;
  if (ra !== rb) return ra - rb;
  return String(a).localeCompare(String(b), 'ru', { sensitivity: 'base' });
}

export function buildCatalogFeelingFacets(items: CatalogSearchableItem[]): string[] {
  const keys = collectCatalogFeelingKeysFromItems(items);
  return CATALOG_FEELING_FILTER_ORDER.filter((k) => keys.has(k));
}

export function getCatalogFeelingLabelRu(key: string): string {
  return CATALOG_FEELING_LABELS_RU[key] || String(key || '').trim();
}
