import crypto from 'crypto';
import { ensureUserSchema, getSql } from './db';
import { hashPassword, verifyPassword } from './passwords';
import { createVerificationToken, hashVerificationToken, isVerificationExpired } from './verification';

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || null;
}

function rowToUser(row) {
  if (!row) return null;
  const accounts = Array.isArray(row.accounts) ? row.accounts : typeof row.accounts === 'string' ? JSON.parse(row.accounts) : [];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    provider: row.provider,
    passwordSalt: row.password_salt,
    passwordHash: row.password_hash,
    emailVerified: Boolean(row.email_verified),
    verificationTokenHash: row.verification_token_hash,
    verificationExpiresAt: row.verification_expires_at,
    image: row.image,
    plan: row.plan || 'free',
    createdAt: row.created_at,
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
    if (existing.emailVerified) throw Object.assign(new Error('User exists'), { code: 'EXISTS' });
    throw Object.assign(new Error('User pending verification'), { code: 'PENDING' });
  }

  const { salt, hash } = await hashPassword(p);
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();
  const { plain, hash: tokenHash, expiresAt } = createVerificationToken();
  const sql = await sqlReady();
  await sql`
    INSERT INTO users (
      id, name, email, provider, password_salt, password_hash,
      email_verified, verification_token_hash, verification_expires_at, created_at, accounts
    ) VALUES (
      ${id}, ${trimmedName}, ${e}, 'credentials', ${salt}, ${hash},
      FALSE, ${tokenHash}, ${expiresAt}, ${now}, '[]'::jsonb
    )
  `;
  const user = await findUserById(id);
  return { user, verificationToken: plain };
}

export async function verifyCredentialsUser({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user || String(user.provider || '') !== 'credentials') return null;
  const ok = await verifyPassword(password, { salt: user.passwordSalt, hash: user.passwordHash });
  if (!ok) return null;
  if (!user.emailVerified) return null;
  return user;
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
    SET email_verified = TRUE, verification_token_hash = NULL, verification_expires_at = NULL
    WHERE id = ${user.id}
  `;
  return findUserById(user.id);
}

export async function refreshVerificationToken(email, { password, name } = {}) {
  const user = await findUserByEmail(email);
  if (!user || String(user.provider || '') !== 'credentials') {
    throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  }
  if (user.emailVerified) throw Object.assign(new Error('Already verified'), { code: 'ALREADY_VERIFIED' });
  const { plain, hash, expiresAt } = createVerificationToken();
  const sql = await sqlReady();
  const trimmedName = String(name || '').trim();
  const p = String(password || '');
  if (p && p.length >= 6) {
    const { salt, hash: passHash } = await hashPassword(p);
    await sql`
      UPDATE users
      SET verification_token_hash = ${hash},
          verification_expires_at = ${expiresAt},
          password_salt = ${salt},
          password_hash = ${passHash},
          name = COALESCE(${trimmedName || null}, name)
      WHERE id = ${user.id}
    `;
  } else if (trimmedName) {
    await sql`
      UPDATE users
      SET verification_token_hash = ${hash},
          verification_expires_at = ${expiresAt},
          name = ${trimmedName}
      WHERE id = ${user.id}
    `;
  } else {
    await sql`
      UPDATE users
      SET verification_token_hash = ${hash}, verification_expires_at = ${expiresAt}
      WHERE id = ${user.id}
    `;
  }
  return { user: await findUserById(user.id), verificationToken: plain };
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
