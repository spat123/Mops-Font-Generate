/**
 * Диагностика "когда главная не грузится":
 * - возвращает базовую информацию о маршруте (CF/Vercel заголовки)
 * - делает несколько коротких fetch с сервера (self + внешние сервисы)
 *
 * Открывается напрямую в браузере: /api/diagnostics/smoke
 */
async function timedFetch(url, init = {}) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutMs = Math.max(1000, Number(init?.timeoutMs || 0) || 6000);
    const timeout = setTimeout(() => controller.abort('timeout'), timeoutMs);
    const res = await fetch(url, {
      ...init,
      timeoutMs: undefined,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DinamicFont-Smoke/1.0)',
        ...(init.headers || {}),
      },
    });
    clearTimeout(timeout);
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - start, error: String(e?.message || e).slice(0, 200) };
  }
}

function firstHeader(req, name) {
  const v = req.headers?.[name];
  return Array.isArray(v) ? v[0] : v ?? null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const host = firstHeader(req, 'host');
  const proto = String(firstHeader(req, 'x-forwarded-proto') || 'https').split(',')[0].trim();
  const origin = host ? `${proto}://${host}` : null;

  const timeoutMs = Math.max(1000, Math.min(15000, Number(req.query?.timeoutMs || 0) || 6000));
  const includeAuthSession = String(req.query?.authSession || '1') !== '0';

  const ipForwarded = String(firstHeader(req, 'x-forwarded-for') || '').split(',')[0].trim() || null;

  const meta = {
    at: new Date().toISOString(),
    url: origin ? `${origin}${req.url || ''}` : null,
    origin,
    host,
    proto,
    ip: ipForwarded,
    country: firstHeader(req, 'x-vercel-ip-country') || firstHeader(req, 'cf-ipcountry') || null,
    vercelRegion: process.env.VERCEL_REGION || null,
    cfRay: firstHeader(req, 'cf-ray'),
    cfConnectingIp: firstHeader(req, 'cf-connecting-ip'),
    server: firstHeader(req, 'server'),
  };

  const targets = {
    selfPing: origin ? `${origin}/api/diagnostics/ping` : null,
    ...(includeAuthSession ? { authSession: origin ? `${origin}/api/auth/session` : null } : {}),
    googleMetadata: 'https://fonts.google.com/metadata/fonts',
    fontsourceApi: 'https://api.fontsource.org/v1/fonts',
  };

  const entries = Object.entries(targets);
  const settled = await Promise.allSettled(
    entries.map(async ([key, url]) => {
      if (!url) return [key, { ok: false, status: 0, ms: 0, error: 'no_origin' }];
      const result = await timedFetch(url, { method: 'GET', timeoutMs });
      return [key, result];
    }),
  );

  const results = {};
  for (const item of settled) {
    if (item.status === 'fulfilled' && Array.isArray(item.value) && item.value.length === 2) {
      const [key, value] = item.value;
      results[key] = value;
    }
  }

  const payload = { ...meta, timeoutMs, results };
  console.log('[diag-smoke]', JSON.stringify(payload));

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(payload);
}

