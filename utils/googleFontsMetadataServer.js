/**
 * Сервер: один кэш metadata Google Fonts (fonts.google.com/metadata/fonts).
 * Используется API маршрутами family-axes и github-vf.
 */

const SOURCE = 'https://fonts.google.com/metadata/fonts';
const UA = 'Mozilla/5.0 (compatible; MopsFontGenerate/1.0)';
const CACHE_MS = 60 * 60 * 1000;

let cache = { json: null, loadedAt: 0 };
let metadataLoadPromise = null;

export async function getGoogleFontsMetadataFamilyList() {
  const now = Date.now();
  if (cache.json && now - cache.loadedAt < CACHE_MS) {
    return cache.json;
  }
  if (metadataLoadPromise) {
    return metadataLoadPromise;
  }
  metadataLoadPromise = (async () => {
    try {
      const r = await fetch(SOURCE, { headers: { 'User-Agent': UA } });
      if (!r.ok) {
        throw new Error(`Google metadata ${r.status}`);
      }
      const data = JSON.parse(await r.text());
      const list = Array.isArray(data.familyMetadataList) ? data.familyMetadataList : [];
      cache = { json: list, loadedAt: Date.now() };
      return list;
    } finally {
      metadataLoadPromise = null;
    }
  })();
  return metadataLoadPromise;
}
