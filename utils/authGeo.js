/**
 * Определение RU по заголовкам GeoIP на сервере.
 * Фолбэк для локалки/неизвестных прокси: Accept-Language содержит ru.
 */
export function getIsRuGeoFromHeaders(reqOrHeaders) {
  const headers = reqOrHeaders?.headers ? reqOrHeaders.headers : reqOrHeaders;
  const get = (key) => {
    if (!headers) return '';
    if (typeof headers.get === 'function') return String(headers.get(key) || '');
    const v = headers[key] ?? headers[key?.toLowerCase?.()] ?? headers[String(key || '').toLowerCase()];
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

