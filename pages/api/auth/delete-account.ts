import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { isPostgresEnabled } from '../../../lib/auth/db';
import { softDeleteUserById } from '../../../lib/auth/userStore';
import { getRecoverableUntilIso } from '../../../lib/auth/accountDeletion';

type CodedError = { code?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (process.env.VERCEL && !isPostgresEnabled()) {
    res.status(503).json({ error: 'Account deletion requires DATABASE_URL on Vercel' });
    return;
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.userId != null ? String(token.userId) : '';
  if (!userId || userId.startsWith('pending:')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const user = await softDeleteUserById(userId);
    res.status(200).json({
      ok: true,
      recoverableUntil: getRecoverableUntilIso(user?.deletedAt),
    });
  } catch (e) {
    const err = e as CodedError;
    if (err?.code === 'NOT_FOUND') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('[delete-account]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
