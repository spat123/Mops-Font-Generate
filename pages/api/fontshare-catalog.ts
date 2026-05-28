/**
 * Прокси каталога Fontshare (API v2) — кэш на сервере.
 */
import { CatalogProxyFetchError, createCatalogProxyHandler } from '../../utils/createCatalogProxyHandler';
import { normalizeFontshareCatalogItems } from '../../utils/fontshareCatalogNormalize';

const FONTSHARE_API_URL = 'https://api.fontshare.com/v2/fonts';
const CACHE_CONTROL = 'public, s-maxage=3600, max-age=900';

async function fetchFontshareCatalogItems() {
  const r = await fetch(FONTSHARE_API_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinamicFont/1.0)' },
  });
  if (!r.ok) {
    throw new CatalogProxyFetchError('Не удалось получить каталог Fontshare', { status: r.status });
  }
  const data = (await r.json()) as { fonts?: unknown[] };
  const fonts = Array.isArray(data?.fonts) ? data.fonts : [];
  return normalizeFontshareCatalogItems(fonts);
}

export default createCatalogProxyHandler({
  logTag: 'fontshare-catalog',
  cacheTtlMs: 1000 * 60 * 60,
  cacheControl: CACHE_CONTROL,
  fetchItems: fetchFontshareCatalogItems,
});
