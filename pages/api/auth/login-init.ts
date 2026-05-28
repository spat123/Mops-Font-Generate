import type { NextApiRequest, NextApiResponse } from 'next';
import { deviceCookieHeader, initiateCredentialsLogin } from '../../../lib/auth/loginStepUp';
import { isStepUpLoginAvailable } from '../../../lib/auth/stepUpLogin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!isStepUpLoginAvailable()) {
    res.status(503).json({ error: 'Login step-up storage unavailable' });
    return;
  }

  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const result = await initiateCredentialsLogin(req, { email, password });

    if (result.status === 'invalid') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (result.status === 'unverified') {
      res.status(403).json({ error: 'Email not verified', needsVerification: true, email: result.email });
      return;
    }
    if (result.status === 'deleted_recoverable') {
      res.status(403).json({
        error: 'Account was deleted',
        code: 'DELETED_RECOVERABLE',
        email: result.email,
        recoverableUntil: result.recoverableUntil,
      });
      return;
    }
    if (result.status === 'email_failed') {
      res.status(502).json({ error: 'Could not send login code', code: 'EMAIL_FAILED', email: result.email });
      return;
    }
    if (result.status === 'needs_code') {
      if (result.newDeviceId) {
        res.setHeader('Set-Cookie', deviceCookieHeader(result.newDeviceId));
      }
      res.status(200).json({
        needsCode: true,
        challengeId: result.challengeId,
        email: result.email,
      });
      return;
    }

    if (result.newDeviceId) {
      res.setHeader('Set-Cookie', deviceCookieHeader(result.newDeviceId));
    }
    res.status(200).json({ loginToken: result.loginToken });
  } catch (e) {
    console.error('[login-init]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
