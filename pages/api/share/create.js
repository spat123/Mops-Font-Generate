import { isPostgresEnabled } from '../../../lib/auth/db';
import { createShareLink } from '../../../lib/share/shareLinkStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isPostgresEnabled()) {
    res.status(503).json({ error: 'Short links require DATABASE_URL', code: 'UNAVAILABLE' });
    return;
  }

  try {
    const payload = req.body?.payload ?? req.body;
    const { id } = await createShareLink(payload);
    const base = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || '')
      .replace(/\/$/, '')
      || (req.headers.host
        ? `${String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()}://${req.headers.host}`
        : '');
    const url = `${base}/share?id=${encodeURIComponent(id)}`;
    res.status(201).json({ ok: true, id, url });
  } catch (e) {
    if (e?.code === 'VALIDATION') {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }
    console.error('[share/create]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
