/**
 * Приём клиентских диагностических событий → Vercel Logs.
 * Авто-сводка: [client-diag-summary] (без действий пользователя).
 * Расширенный режим: [client-diag] после mfgDiagOn().
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

  const summary = events.find((e) => e?.type === 'auto_summary');
  if (summary?.summaryText) {
    console.log('[client-diag-summary]', summary.summaryText);
    console.log('[client-diag-summary-json]', JSON.stringify({
      at: payload.at,
      ip: payload.ip,
      country: payload.country,
      sessionId: payload.sessionId,
      timings: summary.timings,
      probe: summary.probe,
      probeClientMs: summary.probeClientMs,
      probeError: summary.probeError,
    }));
  } else {
    console.log('[client-diag]', JSON.stringify(payload));
  }

  res.status(204).end();
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};
