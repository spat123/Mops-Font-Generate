import { signIn } from 'next-auth/react';

/**
 * После подтверждения email: войти через loginToken или (fallback) login-init + пароль.
 * На регистрации пароль уже известен — так обходим сбой loginToken между контейнерами.
 */
export async function completeRegistrationSignIn({ email, password, loginToken, callbackUrl }) {
  const cb = callbackUrl || '/';

  if (loginToken) {
    const res = await signIn('credentials', {
      redirect: false,
      loginToken,
      callbackUrl: cb,
    });
    if (!res?.error) return { ok: true };
  }

  const trimmedEmail = String(email || '').trim();
  const p = String(password || '');
  if (!trimmedEmail || !p) {
    return { ok: false, reason: 'no-password' };
  }

  const initRes = await fetch('/api/auth/login-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email: trimmedEmail, password: p }),
  });
  const initData = await initRes.json().catch(() => ({}));

  if (initData?.needsCode) {
    return { ok: false, reason: 'step-up' };
  }
  if (initData?.loginToken) {
    const res = await signIn('credentials', {
      redirect: false,
      loginToken: initData.loginToken,
      callbackUrl: cb,
    });
    if (!res?.error) return { ok: true };
  }

  return { ok: false, reason: 'signin-failed' };
}
