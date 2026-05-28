import { createSessionJsonCache } from './sessionJsonCache';
import { readCatalogJsonIdbCache, writeCatalogJsonIdbCache } from './catalogJsonIdbCache';

export const FONTSOURCE_CATALOG_CACHE_KEY = 'dinamic-fontsource-catalog-v2';
export const FONTSOURCE_MIN_FULL_CATALOG_SIZE = 500;

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
  if (b.length >= FONTSOURCE_MIN_FULL_CATALOG_SIZE) return b;
  if (a.length >= FONTSOURCE_MIN_FULL_CATALOG_SIZE && b.length < FONTSOURCE_MIN_FULL_CATALOG_SIZE) return a;
  return b.length > a.length ? b : a;
}
