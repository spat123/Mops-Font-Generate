import { refreshVerificationToken } from '../../../lib/auth/userStore';
import { sendVerificationEmail } from '../../../lib/auth/sendVerificationEmail';
import { isPostgresEnabled } from '../../../lib/auth/db';

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
    const { user, verificationToken, verificationCode } = await refreshVerificationToken(email);
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken,
      code: verificationCode,
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    if (e?.code === 'ALREADY_VERIFIED') {
      res.status(200).json({ ok: true });
      return;
    }
    if (e?.code === 'NOT_FOUND') {
      res.status(404).json({
        ok: false,
        code: 'NOT_FOUND',
        error:
          'Аккаунт не найден на сервере. На Timeweb без DATABASE_URL регистрация может не сохраняться. Настройте DATABASE_URL и зарегистрируйтесь заново.',
      });
      return;
    }
    if (e?.code === 'EMAIL_FAILED') {
      res.status(502).json({ error: 'Could not send email' });
      return;
    }
    console.error('[resend-verification]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
