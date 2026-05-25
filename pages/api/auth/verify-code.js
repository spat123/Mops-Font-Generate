import { confirmEmailByCode, getCredentialsVerificationStatus } from '../../../lib/auth/userStore';
import { isPostgresEnabled } from '../../../lib/auth/db';
import { deviceCookieHeader, trustDeviceForRequest } from '../../../lib/auth/loginStepUp';
import { issueLoginToken, isStepUpLoginAvailable } from '../../../lib/auth/stepUpLogin';

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
    const status = await getCredentialsVerificationStatus(email);
    if (status?.status === 'not_found') {
      res.status(404).json({
        error:
          'Аккаунт не найден на сервере. На Timeweb без DATABASE_URL регистрация может не сохраняться (несколько контейнеров/перезапуск). Настройте DATABASE_URL и повторите регистрацию.',
        code: 'NOT_FOUND',
      });
      return;
    }
    const user = await confirmEmailByCode(email, code);

    // Почта уже подтверждена в БД — дальше только сессия/устройство.
    // Ошибки trustDevice/loginToken не должны превращаться в «неверный код».
    let loginToken = null;
    try {
      const { newDeviceId } = await trustDeviceForRequest(req, user.id);
      res.setHeader('Set-Cookie', deviceCookieHeader(newDeviceId));
    } catch (trustErr) {
      console.error('[verify-code] trustDevice', trustErr);
    }
    try {
      if (isStepUpLoginAvailable()) {
        loginToken = await issueLoginToken(user.id);
      }
    } catch (tokenErr) {
      console.error('[verify-code] issueLoginToken', tokenErr);
    }

    const needsPasswordSignIn = !loginToken;
    res.status(200).json({
      ok: true,
      loginToken,
      needsPasswordSignIn,
      ...(needsPasswordSignIn && !isPostgresEnabled()
        ? {
            hint:
              'Почта подтверждена. Для автоматического входа на сервере нужен DATABASE_URL (Neon/Postgres). Пока войдите с паролем на странице входа.',
          }
        : {}),
    });
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
