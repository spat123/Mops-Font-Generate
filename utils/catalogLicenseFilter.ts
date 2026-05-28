import type { CatalogSearchableItem } from '../types/catalog';

export const CATALOG_LICENSE_FILTER_ORDER = ['open', 'itf_ffl', 'trial'] as const;

export const CATALOG_LICENSE_LABELS_RU: Record<string, string> = {
  open: 'Open source',
  itf_ffl: 'ITF FFL',
  trial: 'Trial',
};

export function getCatalogItemLicenseKeys(item: CatalogSearchableItem | null | undefined): string[] {
  const keys = new Set<string>();
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const hasGoogleOrFontsource = sources.some((s) => s?.id === 'google' || s?.id === 'fontsource');
  for (const s of sources) {
    const id = s?.id;
    if (id === 'google' || id === 'fontsource') {
      keys.add('open');
      continue;
    }
    if (id === 'fontshare') {
      const raw = s?.raw as { licenseType?: string } | undefined;
      const lt = String((s as { licenseType?: string }).licenseType || raw?.licenseType || 'itf_ffl').trim();
      if (lt === 'sil_ofl') keys.add('open');
      else keys.add('itf_ffl');
      continue;
    }
    if (id === 'demo' && !hasGoogleOrFontsource) {
      keys.add('trial');
    }
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
  return CATALOG_LICENSE_FILTER_ORDER.filter((key) => present.has(key)).map((value) => ({
    value,
    label: CATALOG_LICENSE_LABELS_RU[value] || value,
  }));
}

export function compareCatalogLicenseLabels(a: string, b: string): number {
  const ia = CATALOG_LICENSE_FILTER_ORDER.indexOf(a as (typeof CATALOG_LICENSE_FILTER_ORDER)[number]);
  const ib = CATALOG_LICENSE_FILTER_ORDER.indexOf(b as (typeof CATALOG_LICENSE_FILTER_ORDER)[number]);
  const ra = ia >= 0 ? ia : 999;
  const rb = ib >= 0 ? ib : 999;
  if (ra !== rb) return ra - rb;
  return String(a).localeCompare(String(b), 'ru', { sensitivity: 'base' });
}

export function buildCatalogLicenseFacets(items: CatalogSearchableItem[]): string[] {
  const keys = collectCatalogLicenseKeysFromItems(items);
  return CATALOG_LICENSE_FILTER_ORDER.filter((k) => keys.has(k));
}
