/**
 * Определение RU по заголовкам GeoIP на сервере.
 * Фолбэк для локалки/неизвестных прокси: Accept-Language содержит ru.
 */
type HeaderLike =
  | Headers
  | Record<string, string | string[] | undefined>
  | { headers?: Headers | Record<string, string | string[] | undefined> };

export function getIsRuGeoFromHeaders(reqOrHeaders: HeaderLike | null | undefined): boolean {
  const headers =
    reqOrHeaders && 'headers' in reqOrHeaders && reqOrHeaders.headers
      ? reqOrHeaders.headers
      : reqOrHeaders;
  const get = (key: string): string => {
    if (!headers) return '';
    if (headers instanceof Headers) return String(headers.get(key) || '');
    const record = headers as Record<string, string | string[] | undefined>;
    const v = record[key] ?? record[key.toLowerCase()];
    return v == null ? '' : String(v);
  };

  const countryRaw =
    get('x-vercel-ip-country') ||
    get('x-vercel-country') ||
    get('cf-ipcountry') ||
    get('x-country-code') ||
    get('x-country') ||
    '';

  const country = countryRaw.trim().toUpperCase();
  if (country === 'RU') return true;

  const accept = get('accept-language').toLowerCase();
  if (accept.includes('ru')) return true;

  return false;
}
