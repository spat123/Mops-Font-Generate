function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/**
 * Демо-вход из AUTH_CREDENTIALS_LOGIN / AUTH_CREDENTIALS_PASSWORD (без записи в БД).
 * Используется в login-init и NextAuth authorize.
 */
export function matchEnvCredentialsUser({ email, password }) {
  const expectedLogin = String(process.env.AUTH_CREDENTIALS_LOGIN || '').trim();
  const expectedPassword = String(process.env.AUTH_CREDENTIALS_PASSWORD || '');
  if (!expectedLogin || !expectedPassword) return null;

  const inputLogin = String(email || '').trim();
  const inputPassword = String(password || '');
  if (!inputLogin || !inputPassword) return null;

  const loginOk =
    inputLogin === expectedLogin ||
    (inputLogin.includes('@') &&
      normalizeEmail(inputLogin) === normalizeEmail(expectedLogin));
  if (!loginOk || inputPassword !== expectedPassword) return null;

  const looksLikeEmail = expectedLogin.includes('@');
  return {
    id: `credentials:${expectedLogin}`,
    name: looksLikeEmail ? expectedLogin.split('@')[0] : expectedLogin,
    email: looksLikeEmail ? expectedLogin : null,
    provider: 'credentials',
    emailVerified: true,
    image: null,
    plan: 'free',
    createdAt: null,
    accounts: [],
  };
}

export function isEnvCredentialsLoginEnabled() {
  return Boolean(
    String(process.env.AUTH_CREDENTIALS_LOGIN || '').trim() &&
      String(process.env.AUTH_CREDENTIALS_PASSWORD || ''),
  );
}

/** Восстановить демо-пользователя по id вида `credentials:login` после одноразового loginToken. */
export function resolveEnvCredentialsUserById(userId) {
  const id = String(userId || '').trim();
  const prefix = 'credentials:';
  if (!id.startsWith(prefix) || !isEnvCredentialsLoginEnabled()) return null;

  const expectedLogin = String(process.env.AUTH_CREDENTIALS_LOGIN || '').trim();
  const loginFromId = id.slice(prefix.length);
  const loginOk =
    loginFromId === expectedLogin ||
    (loginFromId.includes('@') &&
      normalizeEmail(loginFromId) === normalizeEmail(expectedLogin));
  if (!loginOk) return null;

  const looksLikeEmail = expectedLogin.includes('@');
  return {
    id,
    name: looksLikeEmail ? expectedLogin.split('@')[0] : expectedLogin,
    email: looksLikeEmail ? expectedLogin : null,
    image: null,
  };
}
