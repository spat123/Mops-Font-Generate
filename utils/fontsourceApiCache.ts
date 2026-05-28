/**
 * Кэш для /api/fontsource/* — Vercel Edge (s-maxage) + браузер.
 * Первый запрос по slug всё ещё идёт на CDN; повторные — из edge за миллисекунды.
 */

type CacheHeaderResponse = {
  setHeader(name: string, value: string | string[]): void;
};

/** Ответ с base64-файлом шрифта (статик / variable). */
export function applyFontsourceFontCacheHeaders(res: CacheHeaderResponse): void {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=86400, stale-while-revalidate=604800, max-age=3600',
  );
  res.setHeader('CDN-Cache-Control', 'public, max-age=86400');
}

/** metadata.json для семейства. */
export function applyFontsourceMetadataCacheHeaders(res: CacheHeaderResponse): void {
  res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
  res.setHeader('CDN-Cache-Control', 'public, max-age=86400');
}

/** Каталог /api/fontsource-catalog. */
export function applyFontsourceCatalogCacheHeaders(res: CacheHeaderResponse): void {
  res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
  res.setHeader('CDN-Cache-Control', 'public, max-age=3600');
}
