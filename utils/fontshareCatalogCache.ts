import {
  createSlugFamilyCatalogCache,
  isSlugFamilyCatalogCacheValid,
  type SlugFamilyCatalogRow,
} from './createSlugFamilyCatalogCache';

export const FONTSHARE_CATALOG_CACHE_KEY = 'dinamic-fontshare-catalog-v1';

export const isFontshareCatalogCacheValid = isSlugFamilyCatalogCacheValid;

const fontshareCatalogSession = createSlugFamilyCatalogCache({
  key: FONTSHARE_CATALOG_CACHE_KEY,
});

export function readFontshareCatalogCache(): SlugFamilyCatalogRow[] {
  return fontshareCatalogSession.read();
}

export function writeFontshareCatalogCache(items: SlugFamilyCatalogRow[]): void {
  fontshareCatalogSession.write(items);
}
