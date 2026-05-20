import { createCredentialsUser, refreshVerificationToken } from '../../../lib/auth/userStore';
import { sendVerificationEmail } from '../../../lib/auth/sendVerificationEmail';
import { isPostgresEnabled } from '../../../lib/auth/db';

export default async function handler(req, res) {
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
      if (e?.code === 'PENDING') {
        result = await refreshVerificationToken(email);
      } else {
        throw e;
      }
    }

    await sendVerificationEmail({
      to: result.user.email,
      name: result.user.name,
      token: result.verificationToken,
    });

    res.status(201).json({ ok: true, needsVerification: true, email: result.user.email });
  } catch (e) {
    if (e?.code === 'EXISTS') {
      res.status(409).json({ error: 'User already exists' });
      return;
    }
    if (e?.code === 'VALIDATION') {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    if (e?.code === 'EMAIL_FAILED') {
      res.status(502).json({ error: 'Could not send verification email' });
      return;
    }
    console.error('[register]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
