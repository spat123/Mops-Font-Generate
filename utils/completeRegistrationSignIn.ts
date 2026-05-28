import { signIn } from 'next-auth/react';

export type CompleteRegistrationSignInParams = {
  email?: string;
  password?: string;
  loginToken?: string;
  callbackUrl?: string;
};

export type CompleteRegistrationSignInResult = {
  ok: boolean;
  reason?: 'no-password' | 'step-up' | 'signin-failed';
};

/**
 * После подтверждения email: войти через loginToken или (fallback) login-init + пароль.
 * На регистрации пароль уже известен — так обходим сбой loginToken между контейнерами.
 */
export async function completeRegistrationSignIn({
  email,
  password,
  loginToken,
  callbackUrl,
}: CompleteRegistrationSignInParams): Promise<CompleteRegistrationSignInResult> {
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
  const initData = (await initRes.json().catch(() => ({}))) as {
    needsCode?: boolean;
    loginToken?: string;
  };

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
