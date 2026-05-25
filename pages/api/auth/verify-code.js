import { confirmEmailByCode } from '../../../lib/auth/userStore';
import { isPostgresEnabled } from '../../../lib/auth/db';
import {
  deviceCookieHeader,
  trustDeviceForRequest,
  issueLoginToken,
  isStepUpLoginAvailable,
} from '../../../lib/auth/loginStepUp';

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
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const code = typeof req.body?.code === 'string' ? req.body.code : String(req.body?.code ?? '');
    const user = await confirmEmailByCode(email, code);
    const { newDeviceId } = await trustDeviceForRequest(req, user.id);
    res.setHeader('Set-Cookie', deviceCookieHeader(newDeviceId));
    let loginToken = null;
    if (isStepUpLoginAvailable()) {
      loginToken = await issueLoginToken(user.id);
    }
    res.status(200).json({ ok: true, loginToken });
  } catch (e) {
    if (e?.code === 'INVALID_CODE') {
      res.status(400).json({ error: 'Неверный код', code: 'INVALID_CODE' });
      return;
    }
    if (e?.code === 'TOKEN_EXPIRED') {
      res.status(400).json({ error: 'Код устарел', code: 'TOKEN_EXPIRED' });
      return;
    }
    console.error('[verify-code]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
