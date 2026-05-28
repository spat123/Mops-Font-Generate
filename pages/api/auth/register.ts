import type { NextApiRequest, NextApiResponse } from 'next';
import { createCredentialsUser, refreshVerificationToken } from '../../../lib/auth/userStore';
import { sendVerificationEmail } from '../../../lib/auth/sendVerificationEmail';
import { isPostgresEnabled } from '../../../lib/auth/db';

type CodedError = { code?: string; recoverableUntil?: string | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (process.env.VERCEL && !isPostgresEnabled()) {
    res.status(503).json({
      error: 'Registration requires DATABASE_URL on Vercel. See docs/AUTH_SETUP.md',
    });
    return;
  }

  try {
    const { name, email, password } = req.body || {};
    let result;
    try {
      result = await createCredentialsUser({ name, email, password });
    } catch (e) {
      const err = e as CodedError;
      if (err?.code === 'PENDING') {
        result = await refreshVerificationToken(email, {
          password,
          name: String(name || '').trim(),
        });
      } else {
        throw e;
      }
    }

    try {
      await sendVerificationEmail({
        to: result.user.email,
        name: result.user.name,
        token: result.verificationToken,
        code: result.verificationCode,
      });
    } catch (mailErr) {
      const err = mailErr as CodedError;
      if (err?.code === 'EMAIL_FAILED') {
        res.status(502).json({
          error: 'Could not send verification email',
          code: 'EMAIL_FAILED',
          needsVerification: true,
          email: result.user.email,
        });
        return;
      }
      throw mailErr;
    }

    res.status(201).json({ ok: true, needsVerification: true, email: result.user.email });
  } catch (e) {
    const err = e as CodedError;
    if (err?.code === 'EXISTS') {
      res.status(409).json({ error: 'User already exists', code: 'EXISTS' });
      return;
    }
    if (err?.code === 'DELETED_RECOVERABLE') {
      res.status(409).json({
        error: 'Account was deleted',
        code: 'DELETED_RECOVERABLE',
        email: String(req.body?.email || '').trim().toLowerCase(),
        recoverableUntil: err.recoverableUntil || null,
      });
      return;
    }
    if (err?.code === 'VALIDATION') {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    console.error('[register]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
