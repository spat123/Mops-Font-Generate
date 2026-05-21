import crypto from 'crypto';
import { ensureUserSchema, getSql } from './db';
import {
  createLoginChallengeCredentials,
  createLoginTokenCredentials,
  hashVerificationToken,
  isVerificationExpired,
  normalizeVerificationCode,
} from './verification';

const TRUSTED_DEVICE_DAYS = 30;
const MAX_CHALLENGE_ATTEMPTS = 5;

async function sqlReady() {
  await ensureUserSchema();
  const sql = getSql();
  if (!sql) throw new Error('Postgres not configured');
  return sql;
}

export async function isTrustedDevice({ userId, deviceHash }) {
  const uid = String(userId || '').trim();
  const hash = String(deviceHash || '').trim();
  if (!uid || !hash) return false;
  const sql = await sqlReady();
  const rows = await sql`
    SELECT id FROM trusted_devices
    WHERE user_id = ${uid} AND device_hash = ${hash}
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function trustDevice({ userId, deviceHash, deviceLabel }) {
  const uid = String(userId || '').trim();
  const hash = String(deviceHash || '').trim();
  if (!uid || !hash) return;
  const sql = await sqlReady();
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO trusted_devices (id, user_id, device_hash, device_label, expires_at, last_seen_at, created_at)
    VALUES (${id}, ${uid}, ${hash}, ${deviceLabel || null}, ${expiresAt}, NOW(), NOW())
    ON CONFLICT (user_id, device_hash) DO UPDATE SET
      last_seen_at = NOW(),
      expires_at = EXCLUDED.expires_at,
      device_label = COALESCE(EXCLUDED.device_label, trusted_devices.device_label)
  `;
}

export async function touchTrustedDevice({ userId, deviceHash }) {
  const uid = String(userId || '').trim();
  const hash = String(deviceHash || '').trim();
  if (!uid || !hash) return;
  const sql = await sqlReady();
  await sql`
    UPDATE trusted_devices SET last_seen_at = NOW()
    WHERE user_id = ${uid} AND device_hash = ${hash}
      AND (expires_at IS NULL OR expires_at > NOW())
  `;
}

export async function issueLoginToken(userId) {
  const uid = String(userId || '').trim();
  if (!uid) throw Object.assign(new Error('Invalid user'), { code: 'VALIDATION' });
  const { plain, hash, expiresAt } = createLoginTokenCredentials();
  const sql = await sqlReady();
  await sql`
    INSERT INTO login_tokens (token_hash, user_id, expires_at, created_at)
    VALUES (${hash}, ${uid}, ${expiresAt}, NOW())
  `;
  return plain;
}

export async function consumeLoginToken(plainToken) {
  const hash = hashVerificationToken(plainToken);
  const sql = await sqlReady();
  const rows = await sql`
    SELECT user_id, expires_at, used_at FROM login_tokens WHERE token_hash = ${hash} LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.used_at) return null;
  if (isVerificationExpired(row.expires_at)) {
    await sql`DELETE FROM login_tokens WHERE token_hash = ${hash}`;
    return null;
  }
  await sql`UPDATE login_tokens SET used_at = NOW() WHERE token_hash = ${hash}`;
  return String(row.user_id || '').trim() || null;
}

export async function createLoginChallenge({ userId, deviceHash }) {
  const uid = String(userId || '').trim();
  if (!uid) throw Object.assign(new Error('Invalid user'), { code: 'VALIDATION' });
  const { codePlain, codeHash, expiresAt } = createLoginChallengeCredentials();
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const sql = await sqlReady();
  // Сбрасываем все активные коды пользователя — иначе при повторном login-init
  // в UI остаётся старый challengeId, а в письме уже новый код.
  await sql`DELETE FROM login_challenges WHERE user_id = ${uid}`;
  await sql`
    INSERT INTO login_challenges (id, user_id, code_hash, device_hash, attempts, expires_at, created_at)
    VALUES (${id}, ${uid}, ${codeHash}, ${deviceHash || null}, 0, ${expiresAt}, NOW())
  `;
  return { challengeId: id, codePlain, expiresAt };
}

export async function verifyLoginChallenge({ challengeId, plainCode }) {
  const id = String(challengeId || '').trim();
  const code = normalizeVerificationCode(plainCode);
  if (!id || code.length !== 6) throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });

  const sql = await sqlReady();
  const rows = await sql`SELECT * FROM login_challenges WHERE id = ${id} LIMIT 1`;
  const row = rows[0];
  if (!row) throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  if (isVerificationExpired(row.expires_at)) {
    await sql`DELETE FROM login_challenges WHERE id = ${id}`;
    throw Object.assign(new Error('Token expired'), { code: 'TOKEN_EXPIRED' });
  }
  if (Number(row.attempts) >= MAX_CHALLENGE_ATTEMPTS) {
    await sql`DELETE FROM login_challenges WHERE id = ${id}`;
    throw Object.assign(new Error('Too many attempts'), { code: 'TOO_MANY_ATTEMPTS' });
  }

  const codeHash = hashVerificationToken(code);
  if (codeHash !== row.code_hash) {
    await sql`UPDATE login_challenges SET attempts = attempts + 1 WHERE id = ${id}`;
    throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  }

  await sql`DELETE FROM login_challenges WHERE id = ${id}`;
  return {
    userId: String(row.user_id || '').trim(),
    deviceHash: row.device_hash ? String(row.device_hash) : null,
  };
}
