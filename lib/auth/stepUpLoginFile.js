import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  createLoginChallengeCredentials,
  createLoginTokenCredentials,
  hashVerificationToken,
  isVerificationExpired,
  normalizeVerificationCode,
} from './verification';

const STORE_FILE = path.join(process.cwd(), 'data', 'step-up-login.json');
const TRUSTED_DEVICE_DAYS = 30;
const MAX_CHALLENGE_ATTEMPTS = 5;

const defaultStore = () => ({ trustedDevices: [], loginChallenges: [], loginTokens: [] });

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      trustedDevices: Array.isArray(parsed?.trustedDevices) ? parsed.trustedDevices : [],
      loginChallenges: Array.isArray(parsed?.loginChallenges) ? parsed.loginChallenges : [],
      loginTokens: Array.isArray(parsed?.loginTokens) ? parsed.loginTokens : [],
    };
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return defaultStore();
    throw e;
  }
}

async function writeStore(store) {
  if (process.env.VERCEL) {
    console.warn('[stepUpLogin] skip persist: read-only deployment');
    return false;
  }
  const dir = path.dirname(STORE_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  return true;
}

export async function isTrustedDevice({ userId, deviceHash }) {
  const store = await readStore();
  const now = Date.now();
  return store.trustedDevices.some(
    (d) =>
      d.userId === userId &&
      d.deviceHash === deviceHash &&
      (!d.expiresAt || Date.parse(d.expiresAt) > now),
  );
}

export async function trustDevice({ userId, deviceHash, deviceLabel }) {
  const store = await readStore();
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const existing = store.trustedDevices.find((d) => d.userId === userId && d.deviceHash === deviceHash);
  if (existing) {
    existing.expiresAt = expiresAt;
    existing.lastSeenAt = new Date().toISOString();
    if (deviceLabel) existing.deviceLabel = deviceLabel;
  } else {
    store.trustedDevices.push({
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      userId,
      deviceHash,
      deviceLabel: deviceLabel || null,
      expiresAt,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }
  await writeStore(store);
}

export async function touchTrustedDevice({ userId, deviceHash }) {
  const store = await readStore();
  const row = store.trustedDevices.find((d) => d.userId === userId && d.deviceHash === deviceHash);
  if (row) {
    row.lastSeenAt = new Date().toISOString();
    await writeStore(store);
  }
}

export async function issueLoginToken(userId) {
  const { plain, hash, expiresAt } = createLoginTokenCredentials();
  const store = await readStore();
  store.loginTokens.push({ tokenHash: hash, userId, expiresAt, usedAt: null, createdAt: new Date().toISOString() });
  await writeStore(store);
  return plain;
}

export async function consumeLoginToken(plainToken) {
  const hash = hashVerificationToken(plainToken);
  const store = await readStore();
  const row = store.loginTokens.find((t) => t.tokenHash === hash && !t.usedAt);
  if (!row || isVerificationExpired(row.expiresAt)) return null;
  row.usedAt = new Date().toISOString();
  await writeStore(store);
  return row.userId;
}

export async function createLoginChallenge({ userId, deviceHash }) {
  const { codePlain, codeHash, expiresAt } = createLoginChallengeCredentials();
  const store = await readStore();
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  store.loginChallenges = store.loginChallenges.filter((c) => c.userId !== userId || !isVerificationExpired(c.expiresAt));
  store.loginChallenges.push({
    id,
    userId,
    codeHash,
    deviceHash: deviceHash || null,
    attempts: 0,
    expiresAt,
    createdAt: new Date().toISOString(),
  });
  await writeStore(store);
  return { challengeId: id, codePlain, expiresAt };
}

export async function verifyLoginChallenge({ challengeId, plainCode }) {
  const code = normalizeVerificationCode(plainCode);
  const store = await readStore();
  const row = store.loginChallenges.find((c) => c.id === challengeId);
  if (!row || code.length !== 6) throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  if (isVerificationExpired(row.expiresAt)) {
    store.loginChallenges = store.loginChallenges.filter((c) => c.id !== challengeId);
    await writeStore(store);
    throw Object.assign(new Error('Token expired'), { code: 'TOKEN_EXPIRED' });
  }
  if (row.attempts >= MAX_CHALLENGE_ATTEMPTS) {
    store.loginChallenges = store.loginChallenges.filter((c) => c.id !== challengeId);
    await writeStore(store);
    throw Object.assign(new Error('Too many attempts'), { code: 'TOO_MANY_ATTEMPTS' });
  }
  if (hashVerificationToken(code) !== row.codeHash) {
    row.attempts += 1;
    await writeStore(store);
    throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  }
  store.loginChallenges = store.loginChallenges.filter((c) => c.id !== challengeId);
  await writeStore(store);
  return { userId: row.userId, deviceHash: row.deviceHash };
}
