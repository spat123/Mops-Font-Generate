import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { linkOAuthAccountToEmail } from '../../../lib/auth/userStore';

type PendingLink = {
  provider?: string;
  providerAccountId?: string;
  email?: string;
  name?: string | null;
  image?: string | null;
};

type CodedError = { code?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const pending = (token?.pendingLink as PendingLink | null | undefined) || null;
  if (!pending?.provider || !pending?.providerAccountId || !pending?.email) {
    res.status(400).json({ error: 'No pending link' });
    return;
  }

  try {
    const { password } = req.body || {};
    await linkOAuthAccountToEmail({
      email: pending.email,
      password: String(password || ''),
      provider: pending.provider,
      providerAccountId: pending.providerAccountId,
      name: pending.name,
      image: pending.image,
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    const err = e as CodedError;
    if (err?.code === 'UNAUTHORIZED') {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
    if (err?.code === 'CONFLICT') {
      res.status(409).json({ error: 'Account already linked' });
      return;
    }
    res.status(500).json({ error: 'Internal error' });
  }
}
