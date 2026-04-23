import { createSessionJsonCache } from './sessionJsonCache';

export const FONTSOURCE_CATALOG_CACHE_KEY = 'mops-fontsource-catalog-v1';

export function isFontsourceCatalogCacheValid(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.some((row) => row && typeof row.id === 'string' && typeof row.family === 'string')
  );
}

const fontsourceCatalogSession = createSessionJsonCache({
  key: FONTSOURCE_CATALOG_CACHE_KEY,
  isValid: isFontsourceCatalogCacheValid,
});

export function readFontsourceCatalogCache() {
  return fontsourceCatalogSession.read();
}

export function writeFontsourceCatalogCache(items) {
  fontsourceCatalogSession.write(items);
}
