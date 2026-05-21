import { completeLoginChallenge, deviceCookieHeader } from '../../../lib/auth/loginStepUp';
import { isStepUpLoginAvailable } from '../../../lib/auth/stepUpLogin';

export default async function handler(req, res) {
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
    const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : '';
    const code = typeof req.body?.code === 'string' ? req.body.code : String(req.body?.code ?? '');
    const { loginToken, newDeviceId } = await completeLoginChallenge(req, {
      challengeId,
      code,
    });
    if (newDeviceId) {
      res.setHeader('Set-Cookie', deviceCookieHeader(newDeviceId));
    }
    res.status(200).json({ loginToken });
  } catch (e) {
    if (e?.code === 'INVALID_CODE') {
      res.status(400).json({ error: 'Invalid code', code: 'INVALID_CODE' });
      return;
    }
    if (e?.code === 'TOKEN_EXPIRED') {
      res.status(400).json({ error: 'Code expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (e?.code === 'TOO_MANY_ATTEMPTS') {
      res.status(429).json({ error: 'Too many attempts', code: 'TOO_MANY_ATTEMPTS' });
      return;
    }
    console.error('[login-verify]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
