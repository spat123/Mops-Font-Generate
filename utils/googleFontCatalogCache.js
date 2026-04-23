import { createSessionJsonCache } from './sessionJsonCache';

export const GOOGLE_FONT_CATALOG_CACHE_KEY = 'mops-google-fonts-catalog-v6';

export function isGoogleFontCatalogCacheValid(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value[0] &&
    Array.isArray(value[0].subsets) &&
    value.some((row) => row && Array.isArray(row.axes)) &&
    Object.prototype.hasOwnProperty.call(value[0], 'primaryScript')
  );
}

const googleCatalogSession = createSessionJsonCache({
  key: GOOGLE_FONT_CATALOG_CACHE_KEY,
  isValid: isGoogleFontCatalogCacheValid,
});

export function readGoogleFontCatalogCache() {
  return googleCatalogSession.read();
}

export function writeGoogleFontCatalogCache(items) {
  googleCatalogSession.write(items);
}

export function clearGoogleFontCatalogCache() {
  googleCatalogSession.clear();
}
