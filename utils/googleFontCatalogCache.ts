import { createSessionJsonCache } from './sessionJsonCache';
import { googleCatalogHasTagMetadata } from './googleFontFamilyTags';

export const GOOGLE_FONT_CATALOG_CACHE_KEY = 'dinamic-google-fonts-catalog-v11';

export type GoogleFontCatalogRow = Record<string, unknown> & {
  family?: string;
  subsets?: string[];
  axes?: unknown[];
  primaryScript?: unknown;
  downloadStyles?: unknown[];
  classifications?: unknown[];
  feelings?: unknown[];
  shapes?: unknown[];
  calligraphy?: unknown[];
  hasSlab?: boolean;
};

export function isGoogleFontCatalogCacheValid(value: unknown): value is GoogleFontCatalogRow[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value[0] ||
    !Array.isArray(value[0].subsets) ||
    !value.some((row) => row && Array.isArray(row.axes)) ||
    !Object.prototype.hasOwnProperty.call(value[0], 'primaryScript') ||
    !Array.isArray(value[0].downloadStyles) ||
    !Array.isArray(value[0].classifications) ||
    !Array.isArray(value[0].feelings) ||
    !Array.isArray(value[0].shapes) ||
    !Array.isArray(value[0].calligraphy) ||
    !Object.prototype.hasOwnProperty.call(value[0], 'hasSlab')
  ) {
    return false;
  }
  return googleCatalogHasTagMetadata(value);
}

const googleCatalogSession = createSessionJsonCache<GoogleFontCatalogRow>({
  key: GOOGLE_FONT_CATALOG_CACHE_KEY,
  isValid: isGoogleFontCatalogCacheValid,
});

export function readGoogleFontCatalogCache(): GoogleFontCatalogRow[] {
  return googleCatalogSession.read();
}

export function writeGoogleFontCatalogCache(items: GoogleFontCatalogRow[]): void {
  googleCatalogSession.write(items);
}

export function clearGoogleFontCatalogCache(): void {
  googleCatalogSession.clear();
}
