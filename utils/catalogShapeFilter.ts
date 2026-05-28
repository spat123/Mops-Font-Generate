import { GOOGLE_SHAPE_TAG_RULES } from './googleFontFamilyTags';
import type { CatalogSearchableItem } from '../types/catalog';

export const CATALOG_SHAPE_FILTER_ORDER = [
  'rounded',
  'sharp',
  'rectangular',
  'soft-rounded',
  'angular',
  'volumetric-3d',
] as const;

export const CATALOG_SHAPE_LABELS_RU: Record<string, string> = {
  rounded: 'Округлый',
  sharp: 'Острый',
  rectangular: 'Прямоугольный',
  'soft-rounded': 'Скруглённый',
  angular: 'Угловатый',
  'volumetric-3d': 'Объёмный (3D)',
};

export function getCatalogItemShapeKeys(item: CatalogSearchableItem | null | undefined): string[] {
  if (Array.isArray(item?.shapes) && item.shapes.length > 0) {
    return item.shapes;
  }
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const keys = new Set<string>();
  for (const s of sources) {
    const raw = s?.raw as { shapes?: string[] } | undefined;
    const list = Array.isArray(raw?.shapes) ? raw.shapes : [];
    for (const key of list) {
      const k = String(key || '').trim();
      if (k) keys.add(k);
    }
  }
  return CATALOG_SHAPE_FILTER_ORDER.filter((k) => keys.has(k));
}

export function itemMatchesCatalogShapeFilter(item: CatalogSearchableItem, filterShape: string): boolean {
  const filter = String(filterShape || '').trim();
  if (!filter) return true;
  return getCatalogItemShapeKeys(item).includes(filter);
}

export function collectCatalogShapeKeysFromItems(items: CatalogSearchableItem[]): Set<string> {
  const set = new Set<string>();
  for (const item of Array.isArray(items) ? items : []) {
    for (const key of getCatalogItemShapeKeys(item)) {
      set.add(key);
    }
  }
  return set;
}

export function buildCatalogShapeFilterOptions(shapeKeysSet: Set<string>) {
  const present = shapeKeysSet instanceof Set ? shapeKeysSet : new Set<string>();
  return CATALOG_SHAPE_FILTER_ORDER.filter((key) => present.has(key)).map((value) => ({
    value,
    label: CATALOG_SHAPE_LABELS_RU[value] || value,
  }));
}

export function compareCatalogShapeLabels(a: string, b: string): number {
  const ia = CATALOG_SHAPE_FILTER_ORDER.indexOf(a as (typeof CATALOG_SHAPE_FILTER_ORDER)[number]);
  const ib = CATALOG_SHAPE_FILTER_ORDER.indexOf(b as (typeof CATALOG_SHAPE_FILTER_ORDER)[number]);
  const ra = ia >= 0 ? ia : 999;
  const rb = ib >= 0 ? ib : 999;
  if (ra !== rb) return ra - rb;
  return String(a).localeCompare(String(b), 'ru', { sensitivity: 'base' });
}

export function buildCatalogShapeFacets(items: CatalogSearchableItem[]): string[] {
  const keys = collectCatalogShapeKeysFromItems(items);
  return CATALOG_SHAPE_FILTER_ORDER.filter((k) => keys.has(k));
}

export function getCatalogShapeLabelRu(key: string): string {
  return CATALOG_SHAPE_LABELS_RU[key] || String(key || '').trim();
}

export function getCatalogShapeGoogleTags(shapeKey: string): string[] {
  return (GOOGLE_SHAPE_TAG_RULES as Record<string, string[]>)[shapeKey] || [];
}
