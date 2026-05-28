import crypto from 'crypto';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const LOGIN_CHALLENGE_TTL_MS = 15 * 60 * 1000;
const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;

/** Ссылка сброса пароля (1 час). */
export function createPasswordResetToken() {
  const tokenPlain = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();
  return {
    plain: tokenPlain,
    hash: hashVerificationToken(tokenPlain),
    expiresAt,
  };
}

export function createVerificationToken() {
  const { tokenPlain, tokenHash, codePlain, codeHash, expiresAt } = createVerificationCredentials();
  return { plain: tokenPlain, hash: tokenHash, codePlain, codeHash, expiresAt };
}

/** Ссылка в письме + 6-значный код для ввода на сайте. */
export function createVerificationCredentials() {
  const tokenPlain = crypto.randomBytes(32).toString('hex');
  const codePlain = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
  return {
    tokenPlain,
    tokenHash: hashVerificationToken(tokenPlain),
    codePlain,
    codeHash: hashVerificationToken(codePlain),
    expiresAt,
  };
}

export function normalizeVerificationCode(value) {
  const raw = String(value || '')
    .replace(/[\s\u00a0\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, '')
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0))
    .replace(/[\uff10-\uff19]/g, (ch) => String(ch.charCodeAt(0) - 0xff10));
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 5) {
    return digits.padStart(6, '0');
  }
  return digits.slice(0, 6);
}

/** 6-значный код входа с нового устройства (15 мин). */
export function createLoginChallengeCredentials() {
  const codePlain = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + LOGIN_CHALLENGE_TTL_MS).toISOString();
  return {
    codePlain,
    codeHash: hashVerificationToken(codePlain),
    expiresAt,
  };
}

export function createLoginTokenCredentials() {
  const plain = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS).toISOString();
  return { plain, hash: hashVerificationToken(plain), expiresAt };
}

export function getLoginTokenTtlMs() {
  return LOGIN_TOKEN_TTL_MS;
}

export function hashVerificationToken(plain) {
  return crypto.createHash('sha256').update(String(plain || '')).digest('hex');
}

export function isVerificationExpired(expiresAt) {
  if (!expiresAt) return true;
  const ms = Date.parse(String(expiresAt));
  return !Number.isFinite(ms) || ms < Date.now();
}
