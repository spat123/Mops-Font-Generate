/**
 * Индекс семейств из всех каталогов DINAMIC FONT для сопоставления с внешними списками.
 */

import { getGoogleFontsMetadataFamilyList } from './googleFontsMetadataServer';
import { normalizeFontshareCatalogItems } from './fontshareCatalogNormalize';
import { normalizeFontfabricTrialProducts } from './fontfabricTrialCatalogNormalize';
import { enrichFontfabricTrialStyleCounts } from './fontfabricStyleCount';
import { fontMatchKeyCandidates, normalizeFontMatchKey } from './catalogFamilyMatchKey';
import { slugifyFontKey } from './fontSlug';
import fs from 'fs/promises';
import { fetchJsonWithTimeout } from './fetchJsonWithTimeout';
import { resolveServerDiskCacheFile } from './serverDiskCachePath';

const FONTSOURCE_FONT_LIST_URL = 'https://api.fontsource.org/fontlist?family';
const FONTSOURCE_FETCH_TIMEOUT_MS = 60_000;
const FONTSOURCE_DISK_CACHE_MIN = 500;
const FONTSHARE_API_URL = 'https://api.fontshare.com/v2/fonts';
const FONTFABRIC_WP_PRODUCTS_URL = 'https://www.fontfabric.com/wp-json/wp/v2/product';

export type CatalogFamilyHit = {
  source: 'google' | 'fontsource' | 'fontshare' | 'fontfabric-trial';
  family: string;
  key: string;
};

export type CatalogFamilyIndex = {
  keys: Set<string>;
  keyToHits: Map<string, CatalogFamilyHit[]>;
  totals: Record<string, number>;
};

function registerHit(index: CatalogFamilyIndex, key: string, hit: CatalogFamilyHit) {
  if (!key) return;
  index.keys.add(key);
  const list = index.keyToHits.get(key) || [];
  const dup = list.some((h) => h.source === hit.source && h.family === hit.family);
  if (!dup) list.push(hit);
  index.keyToHits.set(key, list);
}

function registerFamily(
  index: CatalogFamilyIndex,
  source: CatalogFamilyHit['source'],
  family: string,
  extraKeys: string[] = [],
) {
  const label = String(family || '').trim();
  if (!label) return;

  const candidates = fontMatchKeyCandidates(label, ...extraKeys);
  for (const key of candidates) {
    registerHit(index, key, { source, family: label, key });
  }
  const slug = slugifyFontKey(label);
  if (slug) registerHit(index, slug, { source, family: label, key: slug });
}

async function readDiskFontsourceFamilies(): Promise<Array<{ family: string; id: string }> | null> {
  try {
    const raw = await fs.readFile(resolveServerDiskCacheFile('fontsource-catalog-v1.json'), 'utf8');
    const parsed = JSON.parse(raw) as { items?: unknown[] };
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if (items.length < FONTSOURCE_DISK_CACHE_MIN) return null;
    const out: Array<{ family: string; id: string }> = [];
    for (const row of items) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const family = String(r.family || r.label || '').trim();
      const id = String(r.id || r.slug || '').trim();
      if (!family) continue;
      out.push({ family, id: id || family });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

async function fetchFontsourceFamilies(): Promise<Array<{ family: string; id: string }>> {
  const cached = await readDiskFontsourceFamilies();
  if (cached) return cached;

  const map = await fetchJsonWithTimeout<Record<string, string>>(FONTSOURCE_FONT_LIST_URL, {
    timeoutMs: FONTSOURCE_FETCH_TIMEOUT_MS,
    headers: { Accept: 'application/json' },
  });
  const out: Array<{ family: string; id: string }> = [];
  for (const [id, family] of Object.entries(map || {})) {
    const slug = String(id || '').trim();
    const label = String(family || '').trim();
    if (!slug) continue;
    out.push({ family: label || slug, id: slug });
  }
  return out;
}

async function fetchFontshareFamilies(): Promise<Array<{ family: string; slug: string }>> {
  const r = await fetch(FONTSHARE_API_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinamicFont/1.0)' },
  });
  if (!r.ok) throw new Error(`Fontshare HTTP ${r.status}`);
  const data = (await r.json()) as { fonts?: unknown[] };
  const items = normalizeFontshareCatalogItems(Array.isArray(data?.fonts) ? data.fonts : []);
  return items.map((item) => ({ family: item.family, slug: item.slug }));
}

async function fetchFontfabricFamilies(): Promise<Array<{ family: string; slug: string }>> {
  const all: unknown[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = `${FONTFABRIC_WP_PRODUCTS_URL}?per_page=100&page=${page}&context=view`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinamicFont/1.0)' },
    });
    if (!r.ok) throw new Error(`Fontfabric WP HTTP ${r.status} (page ${page})`);
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 100) break;
  }
  const items = await enrichFontfabricTrialStyleCounts(normalizeFontfabricTrialProducts(all));
  return items.map((item) => ({ family: item.family, slug: item.slug }));
}

export async function buildCatalogFamilyIndex(): Promise<CatalogFamilyIndex> {
  const index: CatalogFamilyIndex = {
    keys: new Set(),
    keyToHits: new Map(),
    totals: {},
  };

  const [googleList, fontsourceList, fontshareList, fontfabricList] = await Promise.all([
    getGoogleFontsMetadataFamilyList(),
    fetchFontsourceFamilies(),
    fetchFontshareFamilies(),
    fetchFontfabricFamilies(),
  ]);

  for (const row of googleList) {
    if (!row || typeof row !== 'object') continue;
    const family = String((row as { family?: string }).family || '').trim();
    if (!family) continue;
    registerFamily(index, 'google', family);
  }
  index.totals.google = googleList.length;

  for (const row of fontsourceList) {
    registerFamily(index, 'fontsource', row.family, [row.id, normalizeFontMatchKey(row.id)]);
  }
  index.totals.fontsource = fontsourceList.length;

  for (const row of fontshareList) {
    registerFamily(index, 'fontshare', row.family, [row.slug]);
  }
  index.totals.fontshare = fontshareList.length;

  for (const row of fontfabricList) {
    registerFamily(index, 'fontfabric-trial', row.family, [row.slug]);
  }
  index.totals['fontfabric-trial'] = fontfabricList.length;

  index.totals.uniqueKeys = index.keys.size;

  return index;
}

export function lookupCatalogFamily(
  index: CatalogFamilyIndex,
  matchKeys: string[],
): CatalogFamilyHit | null {
  for (const key of matchKeys) {
    const hits = index.keyToHits.get(key);
    if (hits?.length) return hits[0];
  }

  const primary = matchKeys[0];
  if (!primary || primary.length < 4) return null;

  for (const key of index.keys) {
    if (key.length < 4) continue;
    if (key === primary) continue;
    if (key.includes(primary) || primary.includes(key)) {
      const hits = index.keyToHits.get(key);
      if (hits?.length) return hits[0];
    }
  }

  return null;
}
