import crypto from 'crypto';
import { ensureUserSchema, getSql } from './db';
import { hashPassword, verifyPassword } from './passwords';
import {
  createPasswordResetToken,
  createVerificationCredentials,
  hashVerificationToken,
  isVerificationExpired,
  normalizeVerificationCode,
} from './verification';
import { getRecoverableUntilIso, isAccountRecoverable } from './accountDeletion';
import { buildDeletedRecoverableError, mapDeletedAtField } from './userStoreAccountLifecycle';

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || null;
}

function rowToUser(row) {
  if (!row) return null;
  const mapped = mapDeletedAtField(row);
  let accounts = [];
  if (Array.isArray(mapped.accounts)) {
    accounts = mapped.accounts;
  } else if (typeof mapped.accounts === 'string') {
    try {
      const parsed = JSON.parse(mapped.accounts);
      accounts = Array.isArray(parsed) ? parsed : [];
    } catch {
      accounts = [];
    }
  }
  return {
    id: mapped.id,
    name: mapped.name,
    email: mapped.email,
    provider: mapped.provider,
    passwordSalt: mapped.password_salt,
    passwordHash: mapped.password_hash,
    emailVerified: Boolean(mapped.email_verified),
    verificationTokenHash: mapped.verification_token_hash,
    verificationCodeHash: mapped.verification_code_hash,
    verificationExpiresAt: mapped.verification_expires_at,
    passwordResetTokenHash: mapped.password_reset_token_hash,
    passwordResetExpiresAt: mapped.password_reset_expires_at,
    image: mapped.image,
    plan: mapped.plan || 'free',
    createdAt: mapped.created_at,
    deletedAt: mapped.deletedAt,
    accounts,
  };
}

async function sqlReady() {
  await ensureUserSchema();
  const sql = getSql();
  if (!sql) throw new Error('Postgres not configured');
  return sql;
}

export async function findUserByEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  const sql = await sqlReady();
  const rows = await sql`SELECT * FROM users WHERE LOWER(email) = ${e} LIMIT 1`;
  return rowToUser(rows[0]);
}

export async function findUserById(id) {
  const uid = String(id || '').trim();
  if (!uid) return null;
  const sql = await sqlReady();
  const rows = await sql`SELECT * FROM users WHERE id = ${uid} LIMIT 1`;
  return rowToUser(rows[0]);
}

export async function findUserByAccount({ provider, providerAccountId }) {
  const p = String(provider || '').trim();
  const id = String(providerAccountId || '').trim();
  if (!p || !id) return null;
  const sql = await sqlReady();
  const rows = await sql`
    SELECT * FROM users
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(accounts) elem
      WHERE elem->>'provider' = ${p} AND elem->>'providerAccountId' = ${id}
    )
    LIMIT 1
  `;
  return rowToUser(rows[0]);
}

export async function createCredentialsUser({ name, email, password }) {
  const trimmedName = String(name || '').trim();
  const e = normalizeEmail(email);
  const p = String(password || '');
  if (!trimmedName) throw Object.assign(new Error('Name required'), { code: 'VALIDATION' });
  if (!e || !e.includes('@')) throw Object.assign(new Error('Email invalid'), { code: 'VALIDATION' });
  if (!p || p.length < 6) throw Object.assign(new Error('Password invalid'), { code: 'VALIDATION' });

  const existing = await findUserByEmail(e);
  if (existing) {
    if (existing.deletedAt) {
      if (isAccountRecoverable(existing)) throw buildDeletedRecoverableError(existing);
      await purgeUserById(existing.id);
    } else if (existing.emailVerified) {
      throw Object.assign(new Error('User exists'), { code: 'EXISTS' });
    } else {
      throw Object.assign(new Error('User pending verification'), { code: 'PENDING' });
    }
  }

  const { salt, hash } = await hashPassword(p);
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  const { tokenPlain, tokenHash, codePlain, codeHash, expiresAt } = createVerificationCredentials();
  const sql = await sqlReady();
  await sql`
    INSERT INTO users (
      id, name, email, provider, password_salt, password_hash,
      email_verified, verification_token_hash, verification_code_hash, verification_expires_at, created_at, accounts
    ) VALUES (
      ${id}, ${trimmedName}, ${e}, 'credentials', ${salt}, ${hash},
      FALSE, ${tokenHash}, ${codeHash}, ${expiresAt}, ${now}, '[]'::jsonb
    )
  `;
  const user = await findUserById(id);
  return { user, verificationToken: tokenPlain, verificationCode: codePlain };
}

export async function authenticateCredentialsForLogin({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user || String(user.provider || '') !== 'credentials') return { status: 'invalid' };
  const ok = await verifyPassword(password, { salt: user.passwordSalt, hash: user.passwordHash });
  if (!ok) return { status: 'invalid' };
  if (user.deletedAt) {
    if (isAccountRecoverable(user)) {
      return {
        status: 'deleted_recoverable',
        email: user.email,
        recoverableUntil: getRecoverableUntilIso(user.deletedAt),
      };
    }
    return { status: 'invalid' };
  }
  if (!user.emailVerified) return { status: 'unverified', email: user.email };
  return { status: 'ok', user };
}

export async function verifyCredentialsUser({ email, password }) {
  const auth = await authenticateCredentialsForLogin({ email, password });
  if (auth.status !== 'ok') return null;
  return auth.user;
}

export async function getCredentialsVerificationStatus(email) {
  const user = await findUserByEmail(email);
  if (!user || String(user.provider || '') !== 'credentials') return { status: 'not_found' };
  if (user.emailVerified) return { status: 'verified' };
  return { status: 'pending' };
}

export async function confirmEmailByToken(plainToken) {
  const hash = hashVerificationToken(plainToken);
  const sql = await sqlReady();
  const rows = await sql`SELECT * FROM users WHERE verification_token_hash = ${hash} LIMIT 1`;
  const user = rowToUser(rows[0]);
  if (!user) throw Object.assign(new Error('Invalid token'), { code: 'INVALID_TOKEN' });
  if (isVerificationExpired(user.verificationExpiresAt)) {
    throw Object.assign(new Error('Token expired'), { code: 'TOKEN_EXPIRED' });
  }
  await sql`
    UPDATE users
    SET email_verified = TRUE,
        verification_token_hash = NULL,
        verification_code_hash = NULL,
        verification_expires_at = NULL
    WHERE id = ${user.id}
  `;
  return findUserById(user.id);
}

async function markEmailVerified(userId) {
  const sql = await sqlReady();
  await sql`
    UPDATE users
    SET email_verified = TRUE,
        verification_token_hash = NULL,
        verification_code_hash = NULL,
        verification_expires_at = NULL
    WHERE id = ${userId}
  `;
  return findUserById(userId);
}

export async function confirmEmailByCode(email, plainCode) {
  const e = normalizeEmail(email);
  const code = normalizeVerificationCode(plainCode);
  if (!e || code.length !== 6) throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  const user = await findUserByEmail(e);
  if (!user || String(user.provider || '') !== 'credentials') {
    throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  }
  if (user.emailVerified) return user;
  if (isVerificationExpired(user.verificationExpiresAt)) {
    throw Object.assign(new Error('Token expired'), { code: 'TOKEN_EXPIRED' });
  }
  const codeHash = hashVerificationToken(code);
  if (!user.verificationCodeHash || user.verificationCodeHash !== codeHash) {
    throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  }
  return markEmailVerified(user.id);
}

export async function refreshVerificationToken(email, { password, name } = {}) {
  const user = await findUserByEmail(email);
  if (!user || String(user.provider || '') !== 'credentials') {
    throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  }
  if (user.emailVerified) throw Object.assign(new Error('Already verified'), { code: 'ALREADY_VERIFIED' });
  const { tokenPlain, tokenHash, codePlain, codeHash, expiresAt } = createVerificationCredentials();
  const sql = await sqlReady();
  const trimmedName = String(name || '').trim();
  const p = String(password || '');
  if (p && p.length >= 6) {
    const { salt, hash: passHash } = await hashPassword(p);
    await sql`
      UPDATE users
      SET verification_token_hash = ${tokenHash},
          verification_code_hash = ${codeHash},
          verification_expires_at = ${expiresAt},
          password_salt = ${salt},
          password_hash = ${passHash},
          name = COALESCE(${trimmedName || null}, name)
      WHERE id = ${user.id}
    `;
  } else if (trimmedName) {
    await sql`
      UPDATE users
      SET verification_token_hash = ${tokenHash},
          verification_code_hash = ${codeHash},
          verification_expires_at = ${expiresAt},
          name = ${trimmedName}
      WHERE id = ${user.id}
    `;
  } else {
    await sql`
      UPDATE users
      SET verification_token_hash = ${tokenHash},
          verification_code_hash = ${codeHash},
          verification_expires_at = ${expiresAt}
      WHERE id = ${user.id}
    `;
  }
  return { user: await findUserById(user.id), verificationToken: tokenPlain, verificationCode: codePlain };
}

export async function upsertOAuthUser({ provider, providerAccountId, email, name, image }) {
  const p = String(provider || '').trim();
  const accountId = String(providerAccountId || '').trim();
  if (!p || !accountId) throw Object.assign(new Error('Account data required'), { code: 'VALIDATION' });

  const e = normalizeEmail(email);
  const sql = await sqlReady();
  const now = new Date().toISOString();

  const byAccount = await findUserByAccount({ provider: p, providerAccountId: accountId });
  if (byAccount) {
    if (byAccount.deletedAt) throw buildDeletedRecoverableError(byAccount);
    await sql`
      UPDATE users
      SET email = COALESCE(${e}, email),
          name = COALESCE(${String(name || '').trim() || null}, name),
          image = COALESCE(${String(image || '').trim() || null}, image),
          email_verified = TRUE
      WHERE id = ${byAccount.id}
    `;
    return findUserById(byAccount.id);
  }

  const byEmail = e ? await findUserByEmail(e) : null;
  if (byEmail) {
    if (byEmail.deletedAt) throw buildDeletedRecoverableError(byEmail);
    if (String(byEmail.provider || '') === 'credentials') {
      throw Object.assign(new Error('Email already exists, linking required'), { code: 'LINK_REQUIRED' });
    }
    const accounts = Array.isArray(byEmail.accounts) ? [...byEmail.accounts] : [];
    if (!accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === accountId)) {
      accounts.push({ provider: p, providerAccountId: accountId, linkedAt: now });
    }
    await sql`
      UPDATE users
      SET accounts = ${JSON.stringify(accounts)}::jsonb,
          image = COALESCE(${String(image || '').trim() || null}, image),
          name = COALESCE(${String(name || '').trim() || null}, name),
          email_verified = TRUE
      WHERE id = ${byEmail.id}
    `;
    return findUserById(byEmail.id);
  }

  const newId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const accounts = [{ provider: p, providerAccountId: accountId, linkedAt: now }];
  await sql`
    INSERT INTO users (id, name, email, provider, image, email_verified, created_at, accounts)
    VALUES (
      ${newId},
      ${String(name || '').trim() || null},
      ${e},
      ${p},
      ${String(image || '').trim() || null},
      TRUE,
      ${now},
      ${JSON.stringify(accounts)}::jsonb
    )
  `;
  return findUserById(newId);
}

export async function linkOAuthAccountToEmail({ email, password, provider, providerAccountId, name, image }) {
  const user = await verifyCredentialsUser({ email, password });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { code: 'UNAUTHORIZED' });

  const p = String(provider || '').trim();
  const accountId = String(providerAccountId || '').trim();
  const conflict = await findUserByAccount({ provider: p, providerAccountId: accountId });
  if (conflict && conflict.id !== user.id) {
    throw Object.assign(new Error('Account already linked'), { code: 'CONFLICT' });
  }

  const now = new Date().toISOString();
  const accounts = Array.isArray(user.accounts) ? [...user.accounts] : [];
  if (!accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === accountId)) {
    accounts.push({ provider: p, providerAccountId: accountId, linkedAt: now });
  }
  const sql = await sqlReady();
  await sql`
    UPDATE users
    SET accounts = ${JSON.stringify(accounts)}::jsonb,
        name = COALESCE(${String(name || '').trim() || null}, name),
        image = COALESCE(${String(image || '').trim() || null}, image)
    WHERE id = ${user.id}
  `;
  return findUserById(user.id);
}

async function purgeUserById(userId) {
  const uid = String(userId || '').trim();
  if (!uid) return;
  const sql = await sqlReady();
  await sql`DELETE FROM trusted_devices WHERE user_id = ${uid}`;
  await sql`DELETE FROM login_challenges WHERE user_id = ${uid}`;
  await sql`DELETE FROM users WHERE id = ${uid}`;
}

export async function softDeleteUserById(userId) {
  const uid = String(userId || '').trim();
  if (!uid) throw Object.assign(new Error('User id required'), { code: 'VALIDATION' });
  const user = await findUserById(uid);
  if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  if (user.deletedAt) return user;
  const sql = await sqlReady();
  const now = new Date().toISOString();
  await sql`DELETE FROM login_challenges WHERE user_id = ${uid}`;
  await sql`
    UPDATE users
    SET deleted_at = ${now},
        verification_token_hash = NULL,
        verification_code_hash = NULL,
        verification_expires_at = NULL,
        password_reset_token_hash = NULL,
        password_reset_expires_at = NULL
    WHERE id = ${uid}
  `;
  await sql`DELETE FROM trusted_devices WHERE user_id = ${uid}`;
  return findUserById(uid);
}

/** Запрос сброса пароля: только credentials, подтверждённый email, не удалён. */
export async function issuePasswordResetForEmail(email) {
  const e = normalizeEmail(email);
  if (!e || !e.includes('@')) return null;
  const user = await findUserByEmail(e);
  if (!user || String(user.provider || '') !== 'credentials') return null;
  if (!user.emailVerified || user.deletedAt || !user.passwordHash) return null;

  const { plain, hash, expiresAt } = createPasswordResetToken();
  const sql = await sqlReady();
  await sql`
    UPDATE users
    SET password_reset_token_hash = ${hash},
        password_reset_expires_at = ${expiresAt}
    WHERE id = ${user.id}
  `;
  return { user, resetToken: plain };
}

export async function resetPasswordByToken(plainToken, newPassword) {
  const p = String(newPassword || '');
  if (!p || p.length < 6) throw Object.assign(new Error('Password invalid'), { code: 'VALIDATION' });
  const hash = hashVerificationToken(plainToken);
  const sql = await sqlReady();
  const rows = await sql`SELECT * FROM users WHERE password_reset_token_hash = ${hash} LIMIT 1`;
  const user = rowToUser(rows[0]);
  if (!user) throw Object.assign(new Error('Invalid token'), { code: 'INVALID_TOKEN' });
  if (isVerificationExpired(user.passwordResetExpiresAt)) {
    throw Object.assign(new Error('Token expired'), { code: 'TOKEN_EXPIRED' });
  }
  const { salt, hash: passHash } = await hashPassword(p);
  await sql`
    UPDATE users
    SET password_salt = ${salt},
        password_hash = ${passHash},
        password_reset_token_hash = NULL,
        password_reset_expires_at = NULL
    WHERE id = ${user.id}
  `;
  await sql`DELETE FROM trusted_devices WHERE user_id = ${user.id}`;
  await sql`DELETE FROM login_challenges WHERE user_id = ${user.id}`;
  return findUserById(user.id);
}

export async function restoreCredentialsAccount({ email, password }) {
  const e = normalizeEmail(email);
  const p = String(password || '');
  if (!e || !p) throw Object.assign(new Error('Invalid input'), { code: 'VALIDATION' });
  const user = await findUserByEmail(e);
  if (!user || String(user.provider || '') !== 'credentials') {
    throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  }
  if (!user.deletedAt) throw Object.assign(new Error('Account is active'), { code: 'NOT_DELETED' });
  if (!isAccountRecoverable(user)) {
    throw Object.assign(new Error('Recovery period expired'), { code: 'DELETED_EXPIRED' });
  }
  const ok = await verifyPassword(p, { salt: user.passwordSalt, hash: user.passwordHash });
  if (!ok) throw Object.assign(new Error('Invalid password'), { code: 'INVALID_PASSWORD' });

  const sql = await sqlReady();
  await sql`
    UPDATE users
    SET deleted_at = NULL,
        email_verified = TRUE,
        verification_token_hash = NULL,
        verification_code_hash = NULL,
        verification_expires_at = NULL
    WHERE id = ${user.id}
  `;
  return findUserById(user.id);
}
