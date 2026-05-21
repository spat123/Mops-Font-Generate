/**
 * Серверная проверка доступности внешних сервисов (для ?diag=1).
 * Логи: [network-probe] в Vercel Logs.
 */

const PROBES = [
  { id: 'self', url: null },
  { id: 'google_metadata', url: 'https://fonts.google.com/metadata/fonts' },
  { id: 'fontsource_api', url: 'https://api.fontsource.org/v1/fonts' },
];

async function timedFetch(url, init = {}) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), 12000);
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DinamicFont-Diag/1.0)',
        ...(init.headers || {}),
      },
    });
    clearTimeout(timeout);
    return {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - start,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - start,
      error: String(e?.message || e).slice(0, 200),
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const host = req.headers.host;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const selfUrl = host ? `${proto}://${host}/` : null;

  const results = {};
  for (const probe of PROBES) {
    const url = probe.id === 'self' ? selfUrl : probe.url;
    if (!url) {
      results[probe.id] = { ok: false, error: 'no_host' };
      continue;
    }
    results[probe.id] =
      probe.id === 'self'
        ? await timedFetch(url, { method: 'HEAD' })
        : await timedFetch(url, { method: 'GET' });
  }

  const payload = {
    at: new Date().toISOString(),
    vercelRegion: process.env.VERCEL_REGION || null,
    results,
  };

  console.log('[network-probe]', JSON.stringify(payload));

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(payload);
}
