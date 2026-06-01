/** Публичный origin для OG (редиректы, fetch статики). */
export function getPublicOriginForOg(req: Request): string {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const url = resolveRequestUrl(req);
  const hostname = url.hostname;
  if (hostname === '0.0.0.0' || hostname === '127.0.0.1' || hostname === 'localhost') {
    return 'https://dynamicfont.ru';
  }
  return `${url.protocol}//${url.host}`;
}

/**
 * База для внутреннего fetch /api/share/:id на standalone (Node).
 * На Edge — пустая строка, используйте публичный origin.
 */
export function getInternalApiBaseForOg(): string {
  if (process.env.NEXT_RUNTIME === 'edge') return '';
  const explicit = String(process.env.INTERNAL_APP_URL || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const port = String(process.env.PORT || '').trim();
  if (port) return `http://127.0.0.1:${port}`;
  return '';
}

/** req.url на standalone — относительный путь; без base URL `new URL()` падает. */
export function resolveRequestUrl(req: Request): URL {
  const raw = String(req.url || '/');
  if (/^https?:\/\//i.test(raw)) {
    return new URL(raw);
  }
  const host =
    req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    req.headers.get('host')?.trim() ||
    'localhost:3000';
  const proto =
    req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return new URL(raw, `${proto}://${host}`);
}
