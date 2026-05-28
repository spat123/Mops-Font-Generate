/**
 * Декодирование `share` на сервере (Node). Браузерная версия — libraryShareLink.ts (atob).
 */
import type { LibrarySharePayload } from './libraryShareLink';

function parseSharePayloadJson(json: string): LibrarySharePayload | null {
  const data = JSON.parse(json) as LibrarySharePayload;
  if (!data || typeof data !== 'object') return null;
  if (Number(data.version) !== 1) return null;
  if (!Array.isArray(data.items)) return null;
  return data;
}

export function decodeLibrarySharePayloadFromQueryParam(
  param: string | null | undefined,
): LibrarySharePayload | null {
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
