import {
  CATALOG_LICENSE_FILTER_ORDER,
  CATALOG_LICENSE_LABELS_RU,
} from '../config/fontLicenses';
import { fontMatchKeyCandidates } from './catalogFamilyMatchKey';
import { normalizeFontLicenseId } from './fontLicenseNormalize';
import type { CatalogSearchableItem } from '../types/catalog';

export { CATALOG_LICENSE_FILTER_ORDER, CATALOG_LICENSE_LABELS_RU };

/** Google Fonts в metadata не отдаёт license — по умолчанию OFL (большинство семейств). */
export const GOOGLE_CATALOG_DEFAULT_LICENSE_ID = 'sil-ofl-1.1';

let catalogLicenseInheritIndex: Map<string, string> | null = null;

function licenseIdFromSource(sourceId: string, raw: Record<string, unknown> | null | undefined): string {
  if (!raw || typeof raw !== 'object') {
    if (sourceId === 'demo') return 'trial';
    return 'unknown';
  }

  if (sourceId === 'google') {
    const fromRow = normalizeFontLicenseId(raw.license ?? raw.licenseType);
    return fromRow === 'unknown' ? GOOGLE_CATALOG_DEFAULT_LICENSE_ID : fromRow;
  }

  if (sourceId === 'fontsource') {
    return normalizeFontLicenseId(raw.license ?? raw.licenseType);
  }

  if (sourceId === 'fontshare') {
    const lt = String(raw.licenseType || '').trim();
    if (lt === 'sil_ofl') return 'sil-ofl-1.1';
    if (lt === 'itf_ffl') return 'itf-ffl';
    return normalizeFontLicenseId(lt);
  }

  if (sourceId === 'demo') return 'trial';

  return normalizeFontLicenseId(raw.license ?? raw.licenseType);
}

function matchKeyCandidatesForItem(
  item: CatalogSearchableItem,
  sources: Array<{ family?: string; raw?: unknown }>,
): string[] {
  const rawFamilies: unknown[] = [];
  for (const s of sources) {
    const raw = (s?.raw ?? {}) as Record<string, unknown>;
    rawFamilies.push(s?.family, raw?.family, raw?.slug, raw?.id, raw?.name, raw?.label);
  }
  return fontMatchKeyCandidates(item?.displayName, item?.familyKey, item?.family, ...rawFamilies);
}

/** Индекс: matchKey → лицензия из Google (для Fontsource-only дублей с другим slug). */
export function buildCatalogLicenseInheritIndex(
  items: CatalogSearchableItem[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of Array.isArray(items) ? items : []) {
    const sources = Array.isArray(item?.sources) ? item.sources : [];
    for (const s of sources) {
      const id = String(s?.id || '').trim();
      if (id !== 'google') continue;
      const raw = (s?.raw ?? s) as Record<string, unknown> | null | undefined;
      const key = licenseIdFromSource('google', raw);
      if (!key || key === 'unknown') continue;
      for (const mk of matchKeyCandidatesForItem(item, [s])) {
        if (!map.has(mk)) map.set(mk, key);
      }
    }
  }
  return map;
}

export function setCatalogLicenseInheritIndex(index: Map<string, string> | null): void {
  catalogLicenseInheritIndex = index;
}

function resolveInheritedLicense(
  item: CatalogSearchableItem,
  sources: Array<{ family?: string; raw?: unknown }>,
): string | null {
  if (!catalogLicenseInheritIndex?.size) return null;
  for (const mk of matchKeyCandidatesForItem(item, sources)) {
    const lic = catalogLicenseInheritIndex.get(mk);
    if (lic && lic !== 'unknown') return lic;
  }
  return null;
}

function licenseKeyForCatalogSource(
  sourceId: string,
  raw: Record<string, unknown> | null | undefined,
  item: CatalogSearchableItem,
  sources: Array<{ id?: string; family?: string; raw?: unknown; licenseType?: string }>,
): string {
  const unifiedLicense = sources.find((s) => s?.id === sourceId)?.licenseType;
  let key =
    unifiedLicense && sourceId !== 'google' && sourceId !== 'fontsource'
      ? licenseIdFromSource(sourceId, { licenseType: unifiedLicense })
      : licenseIdFromSource(sourceId, raw);

  if (key === 'unknown' && (sourceId === 'fontsource' || sourceId === 'fontshare')) {
    const inherited = resolveInheritedLicense(item, sources);
    if (inherited) key = inherited;
  }

  return key;
}

export function getCatalogItemLicenseKeys(item: CatalogSearchableItem | null | undefined): string[] {
  if (!item) return ['unknown'];

  const keys = new Set<string>();
  const sources = Array.isArray(item.sources) ? item.sources : [];

  for (const s of sources) {
    const id = String(s?.id || '').trim();
    if (!id) continue;
    const raw = (s?.raw ?? s) as Record<string, unknown> | null | undefined;
    const key = licenseKeyForCatalogSource(id, raw, item, sources);
    if (key) keys.add(key);
  }

  const known = [...keys].filter((k) => k !== 'unknown');
  if (known.length > 0) {
    keys.delete('unknown');
    return known;
  }

  if (keys.size === 0) {
    const inherited = resolveInheritedLicense(item, sources);
    keys.add(inherited || 'unknown');
  }

  return [...keys];
}

export function itemMatchesCatalogLicenseFilter(
  item: CatalogSearchableItem,
  filterLicense: string,
): boolean {
  const filter = String(filterLicense || '').trim();
  if (!filter) return true;
  return getCatalogItemLicenseKeys(item).includes(filter);
}

export function collectCatalogLicenseKeysFromItems(items: CatalogSearchableItem[]): Set<string> {
  const set = new Set<string>();
  for (const item of Array.isArray(items) ? items : []) {
    for (const key of getCatalogItemLicenseKeys(item)) {
      set.add(key);
    }
  }
  return set;
}

export function buildCatalogLicenseFilterOptions(licenseKeysSet: Set<string>) {
  const present = licenseKeysSet instanceof Set ? licenseKeysSet : new Set<string>();
  const ordered = CATALOG_LICENSE_FILTER_ORDER.filter((key) => present.has(key));
  const extras = [...present].filter((key) => !CATALOG_LICENSE_FILTER_ORDER.includes(key)).sort();
  return [...ordered, ...extras].map((value) => ({
    value,
    label: CATALOG_LICENSE_LABELS_RU[value] || value,
  }));
}

export function compareCatalogLicenseLabels(a: string, b: string): number {
  const ia = CATALOG_LICENSE_FILTER_ORDER.indexOf(a);
  const ib = CATALOG_LICENSE_FILTER_ORDER.indexOf(b);
  const ra = ia >= 0 ? ia : 999;
  const rb = ib >= 0 ? ib : 999;
  if (ra !== rb) return ra - rb;
  return String(a).localeCompare(String(b), 'ru', { sensitivity: 'base' });
}

export function buildCatalogLicenseFacets(items: CatalogSearchableItem[]): string[] {
  const keys = collectCatalogLicenseKeysFromItems(items);
  return CATALOG_LICENSE_FILTER_ORDER.filter((k) => keys.has(k));
}
