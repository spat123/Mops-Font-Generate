/**
 * Приём клиентских диагностических событий → Vercel Logs ([client-diag]).
 * Включение на клиенте: ?diag=1 или localStorage mfgNetworkDiag=1
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) {
    res.status(400).json({ error: 'No events' });
    return;
  }

  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const country = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || null;
  const region = req.headers['x-vercel-ip-country-region'] || null;

  const payload = {
    at: new Date().toISOString(),
    sessionId: body.sessionId || null,
    page: body.page || null,
    ip: forwarded || null,
    country,
    region,
    userAgent: req.headers['user-agent'] || null,
    events: events.slice(0, 30),
  };

  console.log('[client-diag]', JSON.stringify(payload));

  res.status(204).end();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};
