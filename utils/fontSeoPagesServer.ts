import {
  buildGeneratedFontsourceSeoPageFromCatalog,
  buildGeneratedGoogleFontSeoPageFromCatalog,
  findFontSeoPage,
  getFontSeoPages,
  type FontSeoPage,
} from '../data/fontSeoPages';
import fs from 'fs/promises';
import { getGoogleFontsMetadataFamilyList } from './googleFontsMetadataServer';
import { buildGoogleCatalogItems } from './googleFontsCatalogSlim';
import { slugifyFontKey } from './fontSlug';
import {
  fetchFontsourceCatalogFromFontlist,
  type FontsourceCatalogRow,
} from './fontsourceCatalogCache';
import { resolveServerDiskCacheFile } from './serverDiskCachePath';

let cachedPages: { loadedAt: number; pages: FontSeoPage[] } | null = null;
const CACHE_MS = 60 * 60 * 1000;
const FONTSOURCE_DISK_CACHE_MIN = 500;

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
  if (manual) return manual;

  const pages = await getAllFontSeoPages();
  return pages.find((page) => page.slug === normalized) || null;
}
