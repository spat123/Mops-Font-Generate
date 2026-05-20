import crypto from 'crypto';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function createVerificationToken() {
  const plain = crypto.randomBytes(32).toString('hex');
  const hash = hashVerificationToken(plain);
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString();
  return { plain, hash, expiresAt };
}

export function hashVerificationToken(plain) {
  return crypto.createHash('sha256').update(String(plain || '')).digest('hex');
}

export function isVerificationExpired(expiresAt) {
  if (!expiresAt) return true;
  const ms = Date.parse(String(expiresAt));
  return !Number.isFinite(ms) || ms < Date.now();
}
