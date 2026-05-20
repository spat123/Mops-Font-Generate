/**
 * Декодирование `share` на сервере (Node). Браузерная версия — libraryShareLink.js (atob).
 */

function parseSharePayloadJson(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object') return null;
  if (Number(data.version) !== 1) return null;
  if (!Array.isArray(data.items)) return null;
  return data;
}

/** @returns {import('./libraryShareLink').LibrarySharePayload | null} */
export function decodeLibrarySharePayloadFromQueryParam(param) {
  const raw = String(param ?? '').trim();
  if (!raw) return null;
  try {
    let base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return parseSharePayloadJson(json);
  } catch {
    return null;
  }
}
