import fs from 'fs/promises';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';
import { titleCaseFromKebabSlug } from '../../utils/fontSlug';
import { compareFontFamilyName } from '../../utils/fontSort';
import { canonicalFontCategoryKey, resolveCatalogCategory } from '../../utils/fontCategoryLabels';
import {
  parseFontsourceSubsetStrings,
  parseFontsourceStyleStrings,
  parseFontsourceWeightNumbers,
} from '../../utils/fontsourceApiNormalize';
import { applyFontsourceCatalogCacheHeaders } from '../../utils/fontsourceApiCache';
import { pickCatalogPopularityScore } from '../../utils/catalogPopularityScore';
import { fetchJsonWithTimeout } from '../../utils/fetchJsonWithTimeout';
import { resolveServerDiskCacheFile } from '../../utils/serverDiskCachePath';
import { normalizeFontLicenseId } from '../../utils/fontLicenseNormalize';
import {
  fetchFontsourceCatalogFromFontlist,
  isFontsourceCatalogComplete,
  type FontsourceCatalogRow,
} from '../../utils/fontsourceCatalogCache';

const FONTSOURCE_API_URL = 'https://api.fontsource.org/v1/fonts';
const SERVER_CACHE_TTL_MS = 1000 * 60 * 60;
// Fontsource API может отвечать медленно (большой JSON).
// 60s часто не хватает и мы проваливаемся в урезанный fallback (package.json).
const REMOTE_FETCH_TIMEOUT_MS = 120_000;
// Если удалённый каталог недоступен, fallback (package.json) не должен триггерить
// удалённую загрузку на каждый запрос — иначе UI “ждёт таймаут и всё равно урезано”.
const FALLBACK_MEMORY_TTL_MS = 1000 * 60 * 10;
const DISK_CACHE_PATH = resolveServerDiskCacheFile('fontsource-catalog-v1.json');
const DISK_CACHE_MIN_ITEMS = 500;

type FontsourceCatalogItem = {
  id: string;
  slug: string;
  family: string;
  label: string;
  category: string;
  primaryScript: string;
  subsets: string[];
  weights: number[];
  styles: string[];
  isVariable: boolean;
  hasItalic: boolean;
  styleCount: number;
  popularityScore: number;
  source: string;
  license: string;
};

let serverCache: {
  updatedAt: number;
  items: FontsourceCatalogItem[] | null;
  source: string | null;
} = {
  updatedAt: 0,
  items: null,
  source: null,
};

function normalizeRemoteItem(row: Record<string, unknown>): FontsourceCatalogItem | null {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || '').trim();
  const family = String(row.family || '').trim();
  if (!id || !family) return null;

  const weights = parseFontsourceWeightNumbers(row);
  const styles = parseFontsourceStyleStrings(row);
  const subsets = parseFontsourceSubsetStrings(row);

  return {
    id,
    slug: id,
    family,
    label: family,
    category:
      resolveCatalogCategory({
        category: row.category as string | undefined,
        family,
        id,
        slug: id,
      }) ||
      canonicalFontCategoryKey(row.category as string | undefined) ||
      '',
    primaryScript: String(row.type || ''),
    subsets,
    weights,
    styles,
    isVariable: Boolean(row.variable),
    hasItalic: styles.includes('italic'),
    styleCount: Math.max(1, (weights.length || 1) * (styles.length || 1)),
    popularityScore: pickCatalogPopularityScore(row),
    source: 'fontsource',
    license: normalizeFontLicenseId(row.license),
  };
}

function fontlistRowsToCatalogItems(rows: FontsourceCatalogRow[]): FontsourceCatalogItem[] {
  return rows.map((row) => ({
    id: String(row.id || row.slug || ''),
    slug: String(row.slug || row.id || ''),
    family: String(row.family || row.label || ''),
    label: String(row.label || row.family || ''),
    category: String(row.category || ''),
    primaryScript: String(row.primaryScript || 'fontlist'),
    subsets: Array.isArray(row.subsets) ? row.subsets.map(String) : [],
    weights: Array.isArray(row.weights)
      ? row.weights.map((w) => Number(w)).filter((n) => Number.isFinite(n))
      : [],
    styles: Array.isArray(row.styles) ? row.styles.map(String) : [],
    isVariable: Boolean(row.isVariable),
    hasItalic: Boolean(row.hasItalic),
    styleCount: Math.max(1, Number(row.styleCount) || 1),
    popularityScore: Number(row.popularityScore) || 0,
    source: String(row.source || 'fontsource'),
    license: normalizeFontLicenseId(row.license),
  }));
}

function normalizeRemoteItems(rows: unknown[]): FontsourceCatalogItem[] {
  const normalized = (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeRemoteItem(row as Record<string, unknown>))
    .filter((item): item is FontsourceCatalogItem => Boolean(item));
  normalized.sort((a, b) => {
    const pa = Number(a?.popularityScore) || 0;
    const pb = Number(b?.popularityScore) || 0;
    if (pa !== pb) return pb - pa;
    return compareFontFamilyName(a, b);
  });
  return normalized;
}

async function readInstalledFontsourcePackages(): Promise<FontsourceCatalogItem[]> {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const raw = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(raw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const items: FontsourceCatalogItem[] = [];

  for (const name of Object.keys(deps)) {
    if (!name.startsWith('@fontsource/')) continue;
    const slug = name.slice('@fontsource/'.length).trim();
    if (!slug) continue;
    const label = titleCaseFromKebabSlug(slug);
    items.push({
      id: slug,
      slug,
      family: label,
      label,
      category: '',
      primaryScript: 'package',
      subsets: [],
      weights: [],
      styles: [],
      isVariable: false,
      hasItalic: false,
      styleCount: 1,
      popularityScore: 0,
      source: 'fontsource',
      license: 'unknown',
    });
  }

  items.sort(compareFontFamilyName);
  return items;
}

async function readDiskFontsourceCatalog(): Promise<{ items: FontsourceCatalogItem[]; updatedAt: number } | null> {
  try {
    const raw = await fs.readFile(DISK_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as { items?: unknown[]; updatedAt?: number };
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if (items.length >= DISK_CACHE_MIN_ITEMS) {
      return { items: normalizeRemoteItems(items), updatedAt: Number(parsed?.updatedAt) || 0 };
    }
  } catch {
    /* no cache yet */
  }
  return null;
}

async function writeDiskFontsourceCatalog(items: FontsourceCatalogItem[]) {
  if (!Array.isArray(items) || items.length < DISK_CACHE_MIN_ITEMS) return;
  try {
    await fs.mkdir(path.dirname(DISK_CACHE_PATH), { recursive: true });
    await fs.writeFile(DISK_CACHE_PATH, JSON.stringify({ updatedAt: Date.now(), items }), 'utf8');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('[fontsource-catalog] disk cache write failed:', message);
  }
}

async function fetchRemoteFontsourceCatalog(): Promise<FontsourceCatalogItem[]> {
  const rows = await fetchJsonWithTimeout<unknown[]>(FONTSOURCE_API_URL, {
    timeoutMs: REMOTE_FETCH_TIMEOUT_MS,
    headers: { Accept: 'application/json' },
  });
  return normalizeRemoteItems(rows);
}

let fontsourceRemoteRefresh: Promise<void> | null = null;

/** Не блокирует ответ API: догружает полный каталог с fontsource.org в disk-cache. */
function scheduleFontsourceRemoteRefresh(): void {
  if (fontsourceRemoteRefresh) return;
  fontsourceRemoteRefresh = (async () => {
    try {
      const items = await fetchRemoteFontsourceCatalog();
      if (items.length === 0) return;
      const now = Date.now();
      serverCache = {
        updatedAt: now,
        items,
        source: isFontsourceCatalogComplete(items) ? 'remote' : 'remote-partial',
      };
      if (isFontsourceCatalogComplete(items)) {
        await writeDiskFontsourceCatalog(items);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn('[fontsource-catalog] background refresh failed:', message);
    } finally {
      fontsourceRemoteRefresh = null;
    }
  })();
}

/**
 * Полный каталог Fontsource (через API) с fallback на локально установленные пакеты.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  try {
    const now = Date.now();
    const disk = await readDiskFontsourceCatalog();

    const hasMemoryItems = Array.isArray(serverCache.items) && serverCache.items.length > 0;
    const memoryTtl =
      serverCache.source === 'fallback' ? FALLBACK_MEMORY_TTL_MS : SERVER_CACHE_TTL_MS;
    // Не отдаём из RAM урезанный fallback (5 пакетов) — иначе каталог = только Google.
    const memoryFresh =
      hasMemoryItems &&
      serverCache.source !== 'fallback' &&
      (serverCache.items?.length ?? 0) >= DISK_CACHE_MIN_ITEMS &&
      now - serverCache.updatedAt < memoryTtl;

    if (memoryFresh) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      applyFontsourceCatalogCacheHeaders(res);
      return res.status(200).json({
        items: serverCache.items,
        cached: true,
        source: serverCache.source,
        complete: isFontsourceCatalogComplete(serverCache.items),
      });
    }

    // Полный disk-cache — сразу. Урезанный — тоже сразу + remote в фоне (иначе клиент ловит таймаут 70s).
    if (disk?.items?.length) {
      const complete = isFontsourceCatalogComplete(disk.items);
      if (!complete) {
        scheduleFontsourceRemoteRefresh();
      }
      serverCache = {
        updatedAt: now,
        items: disk.items,
        source: complete ? 'disk' : 'disk-partial',
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      applyFontsourceCatalogCacheHeaders(res);
      return res.status(200).json({
        items: disk.items,
        cached: true,
        source: complete ? 'disk' : 'disk-partial',
        complete,
        refreshing: !complete,
        diskUpdatedAt: disk.updatedAt,
      });
    }

    let items: FontsourceCatalogItem[] = [];
    let source = 'remote';
    try {
      items = await fetchRemoteFontsourceCatalog();
      if (isFontsourceCatalogComplete(items)) {
        await writeDiskFontsourceCatalog(items);
      }
    } catch (remoteErr) {
      const remoteMessage = remoteErr instanceof Error ? remoteErr.message : String(remoteErr);
      console.warn('[fontsource-catalog] remote failed:', remoteMessage);
      if (disk?.items?.length) {
        console.warn('[fontsource-catalog] using partial disk cache:', disk.items.length);
        items = disk.items;
        source = 'disk-partial';
      } else {
        try {
          console.warn('[fontsource-catalog] remote failed, trying fontlist API');
          items = fontlistRowsToCatalogItems(await fetchFontsourceCatalogFromFontlist());
          source = 'fontlist';
        } catch (fontlistErr) {
          const fontlistMessage = fontlistErr instanceof Error ? fontlistErr.message : String(fontlistErr);
          console.warn('[fontsource-catalog] fontlist failed:', fontlistMessage);
          console.warn('[fontsource-catalog] fallback to package.json');
          items = await readInstalledFontsourcePackages();
          source = 'fallback';
        }
      }
    }

    if (items.length > 0 && source !== 'fallback') {
      serverCache = {
        updatedAt: now,
        items,
        source,
      };
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    applyFontsourceCatalogCacheHeaders(res);
    return res.status(200).json({
      items,
      source,
      complete: isFontsourceCatalogComplete(items),
    });
  } catch (e) {
    console.error('[fontsource-catalog]', e);
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'Internal error', details: message });
  }
}
