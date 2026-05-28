/**
 * Сервер: один кэш metadata Google Fonts (fonts.google.com/metadata/fonts).
 * Используется API маршрутами family-axes и github-vf.
 */

const SOURCE = 'https://fonts.google.com/metadata/fonts';
const UA = 'Mozilla/5.0 (compatible; DinamicFont/1.0)';
const CACHE_MS = 60 * 60 * 1000;

let cache: { json: unknown[] | null; loadedAt: number } = { json: null, loadedAt: 0 };
let metadataLoadPromise: Promise<unknown[]> | null = null;

export async function getGoogleFontsMetadataFamilyList(): Promise<unknown[]> {
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
      const data = JSON.parse(await r.text()) as { familyMetadataList?: unknown[] };
      const list = Array.isArray(data.familyMetadataList) ? data.familyMetadataList : [];
      cache = { json: list, loadedAt: Date.now() };
      return list;
    } finally {
      metadataLoadPromise = null;
    }
  })();
  return metadataLoadPromise;
}
