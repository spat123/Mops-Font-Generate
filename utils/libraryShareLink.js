/**
 * Декодирует параметр `share` (base64url) в объект пейлоада.
 * @returns {{ version: number, library?: object, items?: object[] } | null}
 */
export function decodeLibrarySharePayloadFromQueryParam(param) {
  if (param == null) return null;
  const raw = String(param).trim();
  if (!raw) return null;
  if (typeof atob !== 'function') return null;
  try {
    let base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return null;
    if (Number(data.version) !== 1) return null;
    if (!Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Кодирует JSON-пейлоад шаринга библиотеки в параметр URL (base64url).
 */
export function encodeLibrarySharePayloadToQueryParam(payload) {
  if (typeof btoa !== 'function') return '';
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Абсолютный URL страницы `/share` с параметром `share` (без других query).
 */
export function buildAbsoluteLibraryShareUrl(payload) {
  if (typeof window === 'undefined') return '';
  const param = encodeLibrarySharePayloadToQueryParam(payload);
  const url = new URL(`${window.location.origin}/share`);
  url.searchParams.set('share', param);
  return url.toString();
}
