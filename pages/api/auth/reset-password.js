import { isPostgresEnabled } from '../../../lib/auth/db';
import { resetPasswordByToken } from '../../../lib/auth/userStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (process.env.VERCEL && !isPostgresEnabled()) {
    res.status(503).json({ error: 'Service unavailable' });
    return;
  }

  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!token) {
      res.status(400).json({ error: 'Missing token', code: 'INVALID_TOKEN' });
      return;
    }
    await resetPasswordByToken(token, password);
    res.status(200).json({ ok: true });
  } catch (e) {
    if (e?.code === 'INVALID_TOKEN') {
      res.status(400).json({ error: 'Invalid or expired link', code: 'INVALID_TOKEN' });
      return;
    }
    if (e?.code === 'TOKEN_EXPIRED') {
      res.status(400).json({ error: 'Link expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (e?.code === 'VALIDATION') {
      res.status(400).json({ error: 'Password must be at least 6 characters', code: 'VALIDATION' });
      return;
    }
    console.error('[reset-password]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
