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

const FONTSOURCE_API_URL = 'https://api.fontsource.org/v1/fonts';
const SERVER_CACHE_TTL_MS = 1000 * 60 * 60;
const REMOTE_FETCH_TIMEOUT_MS = 30_000;
const DISK_CACHE_PATH = path.join(process.cwd(), '.cache', 'fontsource-catalog-v1.json');
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
  };
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

/**
 * Полный каталог Fontsource (через API) с fallback на локально установленные пакеты.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  try {
    const now = Date.now();
    const memoryFresh =
      Array.isArray(serverCache.items) &&
      serverCache.items.length > 0 &&
      serverCache.source !== 'fallback' &&
      now - serverCache.updatedAt < SERVER_CACHE_TTL_MS;

    if (memoryFresh) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      applyFontsourceCatalogCacheHeaders(res);
      return res.status(200).json({ items: serverCache.items, cached: true, source: serverCache.source });
    }

    let items: FontsourceCatalogItem[] = [];
    let source = 'remote';
    try {
      items = await fetchRemoteFontsourceCatalog();
      if (items.length >= DISK_CACHE_MIN_ITEMS) {
        await writeDiskFontsourceCatalog(items);
      }
    } catch (remoteErr) {
      const remoteMessage = remoteErr instanceof Error ? remoteErr.message : String(remoteErr);
      console.warn('[fontsource-catalog] remote failed:', remoteMessage);
      const disk = await readDiskFontsourceCatalog();
      if (disk?.items?.length) {
        items = disk.items;
        source = 'disk';
      } else {
        console.warn('[fontsource-catalog] fallback to package.json');
        items = await readInstalledFontsourcePackages();
        source = 'fallback';
      }
    }

    if (items.length > 0) {
      serverCache = {
        updatedAt: now,
        items,
        source,
      };
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    applyFontsourceCatalogCacheHeaders(res);
    return res.status(200).json({ items, source });
  } catch (e) {
    console.error('[fontsource-catalog]', e);
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'Internal error', details: message });
  }
}
