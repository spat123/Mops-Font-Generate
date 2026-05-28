import type { NextApiRequest, NextApiResponse } from 'next';
import { isPostgresEnabled } from '../../../lib/auth/db';
import { restoreCredentialsAccount } from '../../../lib/auth/userStore';

type CodedError = { code?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = await restoreCredentialsAccount({ email, password });
    res.status(200).json({ ok: true, email: user?.email || email });
  } catch (e) {
    const err = e as CodedError;
    if (err?.code === 'INVALID_PASSWORD') {
      res.status(401).json({ error: 'Invalid password', code: 'INVALID_PASSWORD' });
      return;
    }
    if (err?.code === 'DELETED_EXPIRED') {
      res.status(410).json({ error: 'Recovery period expired', code: 'DELETED_EXPIRED' });
      return;
    }
    if (err?.code === 'NOT_FOUND' || err?.code === 'NOT_DELETED') {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    console.error('[restore-account]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
