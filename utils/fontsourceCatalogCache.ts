import { createSessionJsonCache } from './sessionJsonCache';
import { readCatalogJsonIdbCache, writeCatalogJsonIdbCache } from './catalogJsonIdbCache';
import { fetchJsonWithTimeout } from './fetchJsonWithTimeout';
import { compareFontFamilyName } from './fontSort';

const FONTSOURCE_FONTLIST_URL = 'https://api.fontsource.org/fontlist?family';

export const FONTSOURCE_CATALOG_CACHE_KEY = 'dinamic-fontsource-catalog-v2';
/** Минимум, чтобы отличить полный каталог от fallback (package.json). */
export const FONTSOURCE_MIN_FULL_CATALOG_SIZE = 500;
/** Ожидаемый размер полного Fontsource API (~2264 семейства, с запасом на рост). */
export const FONTSOURCE_EXPECTED_FULL_CATALOG_SIZE = 2150;

export function isFontsourceCatalogComplete(items: unknown): boolean {
  return Array.isArray(items) && items.length >= FONTSOURCE_EXPECTED_FULL_CATALOG_SIZE;
}

export type FontsourceCatalogRow = Record<string, unknown> & {
  id?: string;
  slug?: string;
  family?: string;
  label?: string;
  isVariable?: boolean;
  subsets?: string[];
};

export function isFontsourceCatalogCacheValid(value: unknown): value is FontsourceCatalogRow[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.some((row) => row && typeof row.id === 'string' && typeof row.family === 'string')
  );
}

const fontsourceCatalogSession = createSessionJsonCache<FontsourceCatalogRow>({
  key: FONTSOURCE_CATALOG_CACHE_KEY,
  isValid: isFontsourceCatalogCacheValid,
});

export function readFontsourceCatalogCache(): FontsourceCatalogRow[] {
  return fontsourceCatalogSession.read();
}

export function writeFontsourceCatalogCache(items: FontsourceCatalogRow[]): void {
  fontsourceCatalogSession.write(items);
  if (Array.isArray(items) && items.length > 0) {
    void writeCatalogJsonIdbCache(FONTSOURCE_CATALOG_CACHE_KEY, items);
  }
}

/** IndexedDB — переживает перезагрузку; sessionStorage — быстрый sync-read. */
export async function readFontsourceCatalogCacheAsync(): Promise<FontsourceCatalogRow[]> {
  const idb = await readCatalogJsonIdbCache<FontsourceCatalogRow[]>(
    FONTSOURCE_CATALOG_CACHE_KEY,
    isFontsourceCatalogCacheValid,
  );
  if (Array.isArray(idb) && idb.length > 0) return idb;
  return readFontsourceCatalogCache();
}

export function pickBetterFontsourceCatalogLists(
  current: FontsourceCatalogRow[] | null | undefined,
  incoming: FontsourceCatalogRow[] | null | undefined,
): FontsourceCatalogRow[] {
  const a = Array.isArray(current) ? current : [];
  const b = Array.isArray(incoming) ? incoming : [];
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  // Всегда оставляем более длинный список: иначе свежий урезанный ответ (2111)
  // затирал полный кэш (2264), если оба >= MIN_FULL.
  return b.length > a.length ? b : a;
}

export function isWeakFontsourceCatalogPayload(
  items: unknown,
  source?: string | null,
): boolean {
  const n = Array.isArray(items) ? items.length : 0;
  if (source === 'fallback') return true;
  return n > 0 && n < FONTSOURCE_MIN_FULL_CATALOG_SIZE;
}

/** Запасной каталог (~2088 семейств), если /api/fontsource-catalog отдал fallback из package.json. */
export async function fetchFontsourceCatalogFromFontlist(): Promise<FontsourceCatalogRow[]> {
  const map = await fetchJsonWithTimeout<Record<string, string>>(FONTSOURCE_FONTLIST_URL, {
    timeoutMs: 90_000,
    headers: { Accept: 'application/json' },
  });
  const rows: FontsourceCatalogRow[] = [];
  for (const [id, family] of Object.entries(map || {})) {
    const slug = String(id || '').trim();
    const label = String(family || slug).trim();
    if (!slug || !label) continue;
    rows.push({
      id: slug,
      slug,
      family: label,
      label,
      subsets: [],
      weights: [],
      styles: [],
      isVariable: false,
      hasItalic: false,
      styleCount: 1,
      popularityScore: 0,
      source: 'fontsource',
      category: '',
      primaryScript: 'fontlist',
      license: 'unknown',
    });
  }
  rows.sort(compareFontFamilyName as (a: FontsourceCatalogRow, b: FontsourceCatalogRow) => number);
  return rows;
}
