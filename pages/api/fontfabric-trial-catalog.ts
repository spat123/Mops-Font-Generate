/**
 * Каталог trial Fontfabric — семейства с официального WP REST API.
 */
import { createCatalogProxyHandler } from '../../utils/createCatalogProxyHandler';
import { enrichFontfabricTrialStyleCounts } from '../../utils/fontfabricStyleCount';
import { normalizeFontfabricTrialProducts } from '../../utils/fontfabricTrialCatalogNormalize';

const WP_PRODUCTS_URL = 'https://www.fontfabric.com/wp-json/wp/v2/product';
const CACHE_CONTROL = 'public, s-maxage=43200, max-age=3600';

async function fetchAllFontfabricProducts() {
  const all: unknown[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const url = `${WP_PRODUCTS_URL}?per_page=100&page=${page}&context=view`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinamicFont/1.0)' },
    });
    if (!r.ok) {
      throw new Error(`Fontfabric WP API HTTP ${r.status} (page ${page})`);
    }
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 100) break;
  }
  return all;
}

async function fetchFontfabricTrialCatalogItems() {
  const products = await fetchAllFontfabricProducts();
  return enrichFontfabricTrialStyleCounts(normalizeFontfabricTrialProducts(products));
}

export default createCatalogProxyHandler({
  logTag: 'fontfabric-trial-catalog',
  cacheTtlMs: 1000 * 60 * 60 * 12,
  cacheControl: CACHE_CONTROL,
  fetchItems: fetchFontfabricTrialCatalogItems,
});
