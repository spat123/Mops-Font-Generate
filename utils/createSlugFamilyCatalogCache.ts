import { createSessionJsonCache } from './sessionJsonCache';

export type SlugFamilyCatalogRow = {
  slug: string;
  family: string;
  [key: string]: unknown;
};

export function isSlugFamilyCatalogCacheValid(value: unknown): value is SlugFamilyCatalogRow[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.some((row) => row && typeof row.slug === 'string' && typeof row.family === 'string')
  );
}

export type SlugFamilyCatalogCache = {
  read: () => SlugFamilyCatalogRow[];
  write: (items: SlugFamilyCatalogRow[]) => void;
  clear: () => void;
};

/**
 * Session-кэш каталога с полями slug + family (Fontshare, Fontfabric trial, …).
 */
export function createSlugFamilyCatalogCache({ key }: { key: string }): SlugFamilyCatalogCache {
  const session = createSessionJsonCache<SlugFamilyCatalogRow>({
    key,
    isValid: isSlugFamilyCatalogCacheValid,
  });

  return {
    read: () => session.read(),
    write: (items) => session.write(items),
    clear: () => session.clear(),
  };
}
