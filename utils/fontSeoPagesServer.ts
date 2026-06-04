import {
  buildGeneratedFontsourceSeoPageFromCatalog,
  buildGeneratedGoogleFontSeoPageFromCatalog,
  findFontSeoPage,
  getFontSeoPages,
  type FontSeoPage,
} from '../data/fontSeoPages';
import fs from 'fs/promises';
import path from 'path';
import { getGoogleFontsMetadataFamilyList } from './googleFontsMetadataServer';
import { buildGoogleCatalogItems } from './googleFontsCatalogSlim';
import { slugifyFontKey } from './fontSlug';
import {
  fetchFontsourceCatalogFromFontlist,
  type FontsourceCatalogRow,
} from './fontsourceCatalogCache';
import { resolveServerDiskCacheFile } from './serverDiskCachePath';
import { fetchGoogleFontCssFacesForFamily } from './googleApiRouteHelpers';
import { CHROME_UA } from './googleFontsCssShared';
import {
  applyFontNameTableToSeoPage,
  extractFontNameTableFromParsedFont,
  type FontNameTable,
} from './fontNameTable';

let cachedPages: { loadedAt: number; pages: FontSeoPage[] } | null = null;
const CACHE_MS = 60 * 60 * 1000;
const FONTSOURCE_DISK_CACHE_MIN = 500;
const NAME_TABLE_CACHE_FILE = 'font-name-table-v2.json';

type FontNameTableDiskCache = {
  updatedAt?: number;
  entries?: Record<string, FontNameTable | null>;
};

function mergeManualPages(generatedPages: FontSeoPage[]): FontSeoPage[] {
  const manualPages = getFontSeoPages();
  const bySlug = new Map<string, FontSeoPage>();

  for (const page of generatedPages) {
    bySlug.set(page.slug, page);
  }
  for (const page of manualPages) {
    bySlug.set(page.slug, page);
  }

  return Array.from(bySlug.values()).sort((a, b) => a.family.localeCompare(b.family, 'ru'));
}

async function readFontsourceDiskRows(): Promise<FontsourceCatalogRow[] | null> {
  try {
    const raw = await fs.readFile(resolveServerDiskCacheFile('fontsource-catalog-v1.json'), 'utf8');
    const parsed = JSON.parse(raw) as { items?: unknown[] };
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if (items.length < FONTSOURCE_DISK_CACHE_MIN) return null;
    return items as FontsourceCatalogRow[];
  } catch {
    return null;
  }
}

async function getFontsourceSeoPages(): Promise<FontSeoPage[]> {
  const rows = (await readFontsourceDiskRows()) || (await fetchFontsourceCatalogFromFontlist());
  return rows
    .map((row) => buildGeneratedFontsourceSeoPageFromCatalog(row as Record<string, unknown>))
    .filter((page): page is FontSeoPage => Boolean(page));
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

async function readNameTableDiskCache(): Promise<FontNameTableDiskCache> {
  try {
    const raw = await fs.readFile(resolveServerDiskCacheFile(NAME_TABLE_CACHE_FILE), 'utf8');
    const parsed = JSON.parse(raw) as FontNameTableDiskCache;
    return parsed && typeof parsed === 'object' ? parsed : { entries: {} };
  } catch {
    return { entries: {} };
  }
}

async function writeNameTableDiskCache(cache: FontNameTableDiskCache): Promise<void> {
  const file = resolveServerDiskCacheFile(NAME_TABLE_CACHE_FILE);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify({ ...cache, updatedAt: Date.now() }), 'utf8');
}

function cacheKeyForPage(page: FontSeoPage): string {
  return `${page.source}:${page.slug}:${page.isVariable ? 'variable' : 'static'}`;
}

async function parseNameTableFromBuffer(buf: Buffer, fontName: string): Promise<FontNameTable | null> {
  const { parseFontBuffer } = await import('./fontParser');
  const parsed = await parseFontBuffer(bufferToArrayBuffer(buf), fontName);
  return extractFontNameTableFromParsedFont(parsed);
}

function familyFromSlug(slug: string): string {
  return String(slug || '')
    .split('-')
    .map((part) => {
      const text = part.trim();
      return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
    })
    .filter(Boolean)
    .join(' ');
}

function buildFallbackGoogleSeoPage(slug: string): FontSeoPage | null {
  const normalized = slugifyFontKey(slug);
  if (!normalized) return null;
  const family = familyFromSlug(normalized);
  if (!family) return null;

  return buildGeneratedGoogleFontSeoPageFromCatalog({
    family,
    isVariable: false,
    hasItalic: false,
    subsets: [],
    styleCount: 1,
    category: '',
  });
}

function pickBestGoogleFace(faces: Array<{ url: string; unicodeRange?: string | null; style?: string }>) {
  return (
    faces.find((face) => face.style !== 'italic' && String(face.unicodeRange || '').includes('U+0000-00FF')) ||
    faces.find((face) => face.style !== 'italic') ||
    faces[0]
  );
}

async function fetchGoogleNameTable(page: FontSeoPage): Promise<FontNameTable | null> {
  const result = await fetchGoogleFontCssFacesForFamily(page.family, {
    variable: page.isVariable,
    weight: '400',
    italic: false,
    wghtMin: undefined,
    wghtMax: undefined,
    subset: 'latin',
  });
  if ('error' in result) return null;

  const face = pickBestGoogleFace(result.faces);
  if (!face?.url) return null;

  const res = await fetch(face.url, { headers: { 'User-Agent': CHROME_UA } });
  if (!res.ok) return null;
  return parseNameTableFromBuffer(Buffer.from(await res.arrayBuffer()), page.family);
}

function fontsourceCandidateUrls(page: FontSeoPage): string[] {
  const slug = page.slug;
  const staticPackage = `https://cdn.jsdelivr.net/npm/@fontsource/${slug}/files`;
  const variablePackage = `https://cdn.jsdelivr.net/npm/@fontsource-variable/${slug}/files`;
  const staticUrls = [
    `${staticPackage}/${slug}-latin-400-normal.woff2`,
    `${staticPackage}/${slug}-latin-ext-400-normal.woff2`,
  ];
  const variableUrls = [
    `${variablePackage}/${slug}-latin-wght-normal.woff2`,
    `${variablePackage}/${slug}-latin-full-normal.woff2`,
    `${variablePackage}/${slug}-latin-ext-wght-normal.woff2`,
  ];
  return page.isVariable ? [...variableUrls, ...staticUrls] : [...staticUrls, ...variableUrls];
}

async function fetchFontsourceNameTable(page: FontSeoPage): Promise<FontNameTable | null> {
  for (const url of fontsourceCandidateUrls(page)) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': CHROME_UA } });
      if (!res.ok) continue;
      const table = await parseNameTableFromBuffer(Buffer.from(await res.arrayBuffer()), page.family);
      if (table) return table;
    } catch {
      // Try next common Fontsource filename.
    }
  }
  return null;
}

async function fetchNameTableForPage(page: FontSeoPage): Promise<FontNameTable | null> {
  if (page.source === 'google') return fetchGoogleNameTable(page);
  return fetchFontsourceNameTable(page);
}

async function enrichFontSeoPageWithNameTable(page: FontSeoPage): Promise<FontSeoPage> {
  const cache = await readNameTableDiskCache();
  const key = cacheKeyForPage(page);
  const cachedTable = cache.entries?.[key];
  if (cachedTable) {
    return applyFontNameTableToSeoPage(page, cachedTable);
  }

  const table = await fetchNameTableForPage(page).catch((error) => {
    console.warn('[fontSeoPagesServer] name table failed:', page.slug, error instanceof Error ? error.message : String(error));
    return null;
  });
  if (table) {
    cache.entries = { ...(cache.entries || {}), [key]: table };
    await writeNameTableDiskCache(cache).catch((error) => {
      console.warn('[fontSeoPagesServer] name table cache write failed:', error instanceof Error ? error.message : String(error));
    });
  }
  return applyFontNameTableToSeoPage(page, table);
}

export async function getAllFontSeoPages(): Promise<FontSeoPage[]> {
  const now = Date.now();
  if (cachedPages && now - cachedPages.loadedAt < CACHE_MS) {
    return cachedPages.pages;
  }

  const metadata = await getGoogleFontsMetadataFamilyList();
  const catalogRows = buildGoogleCatalogItems(metadata, null);
  const generatedPages = catalogRows
    .map((row) => buildGeneratedGoogleFontSeoPageFromCatalog(row as Record<string, unknown>))
    .filter((page): page is FontSeoPage => Boolean(page));
  const googleSlugs = new Set(generatedPages.map((page) => page.slug));
  const fontsourcePages = (await getFontsourceSeoPages()).filter((page) => !googleSlugs.has(page.slug));

  const pages = mergeManualPages([...generatedPages, ...fontsourcePages]);
  cachedPages = { loadedAt: now, pages };
  return pages;
}

export async function findFontSeoPageServer(slug: string): Promise<FontSeoPage | null> {
  const normalized = slugifyFontKey(slug);
  if (!normalized) return null;

  const manual = findFontSeoPage(normalized);
  if (manual) return enrichFontSeoPageWithNameTable(manual);

  const pages = await getAllFontSeoPages().catch((error) => {
    console.warn('[fontSeoPagesServer] catalog lookup failed:', error instanceof Error ? error.message : String(error));
    return [];
  });
  const page = pages.find((item) => item.slug === normalized) || null;
  const fallback = page || buildFallbackGoogleSeoPage(normalized);
  return fallback ? enrichFontSeoPageWithNameTable(fallback) : null;
}
