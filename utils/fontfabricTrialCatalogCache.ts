import {
  createSlugFamilyCatalogCache,
  isSlugFamilyCatalogCacheValid,
  type SlugFamilyCatalogRow,
} from './createSlugFamilyCatalogCache';

export const FONTFABRIC_TRIAL_CATALOG_CACHE_KEY = 'dinamic-fontfabric-trial-catalog-v2';

export const isFontfabricTrialCatalogCacheValid = isSlugFamilyCatalogCacheValid;

const fontfabricTrialCatalogSession = createSlugFamilyCatalogCache({
  key: FONTFABRIC_TRIAL_CATALOG_CACHE_KEY,
});

export function readFontfabricTrialCatalogCache(): SlugFamilyCatalogRow[] {
  return fontfabricTrialCatalogSession.read();
}

export function writeFontfabricTrialCatalogCache(items: SlugFamilyCatalogRow[]): void {
  fontfabricTrialCatalogSession.write(items);
}
