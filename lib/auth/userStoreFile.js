import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from './passwords';
import {
  createVerificationCredentials,
  hashVerificationToken,
  isVerificationExpired,
  normalizeVerificationCode,
} from './verification';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || null;
}

function isUserStoreWriteSkipped() {
  return Boolean(process.env.VERCEL);
}

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return [];
    throw e;
  }
}

async function writeUsers(users) {
  if (isUserStoreWriteSkipped()) {
    console.warn('[userStore] skip persist: read-only deployment (VERCEL)');
    return false;
  }
  try {
    const dir = path.dirname(USERS_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (e) {
    if (e && (e.code === 'EROFS' || e.code === 'EPERM')) {
      console.warn('[userStore] skip persist:', e.code);
      return false;
    }
    throw e;
  }
}

function isEmailVerified(user) {
  if (!user) return false;
  if (user.emailVerified === true) return true;
  if (user.emailVerified === false) return false;
  return String(user?.provider || '') !== 'credentials';
}

function mapUser(row) {
  if (!row) return null;
  return {
    ...row,
    emailVerified: isEmailVerified(row),
  };
}

export async function findUserByEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  const users = await readUsers();
  return mapUser(users.find((u) => normalizeEmail(u?.email) === e) || null);
}

export async function findUserById(id) {
  const uid = String(id || '').trim();
  if (!uid) return null;
  const users = await readUsers();
  return mapUser(users.find((u) => String(u?.id || '').trim() === uid) || null);
}

export async function findUserByAccount({ provider, providerAccountId }) {
  const p = String(provider || '').trim();
  const id = String(providerAccountId || '').trim();
  if (!p || !id) return null;
  const users = await readUsers();
  return mapUser(
    users.find(
      (u) =>
        Array.isArray(u?.accounts) &&
        u.accounts.some(
          (a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === id,
        ),
    ) || null,
  );
}

export async function createCredentialsUser({ name, email, password }) {
  const trimmedName = String(name || '').trim();
  const e = normalizeEmail(email);
  const p = String(password || '');
  if (!trimmedName) throw Object.assign(new Error('Name required'), { code: 'VALIDATION' });
  if (!e || !e.includes('@')) throw Object.assign(new Error('Email invalid'), { code: 'VALIDATION' });
  if (!p || p.length < 6) throw Object.assign(new Error('Password invalid'), { code: 'VALIDATION' });

  const users = await readUsers();
  const existing = users.find((u) => normalizeEmail(u?.email) === e);
  if (existing) {
    if (isEmailVerified(existing)) throw Object.assign(new Error('User exists'), { code: 'EXISTS' });
    throw Object.assign(new Error('User pending verification'), { code: 'PENDING' });
  }

  const { salt, hash } = await hashPassword(p);
  const now = new Date().toISOString();
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const { tokenPlain, tokenHash, codePlain, codeHash, expiresAt } = createVerificationCredentials();
  const next = {
    id,
    name: trimmedName,
    email: e,
    createdAt: now,
    provider: 'credentials',
    passwordSalt: salt,
    passwordHash: hash,
    emailVerified: false,
    verificationTokenHash: tokenHash,
    verificationCodeHash: codeHash,
    verificationExpiresAt: expiresAt,
    accounts: [],
  };
  users.push(next);
  await writeUsers(users);
  return { user: mapUser(next), verificationToken: tokenPlain, verificationCode: codePlain };
}

export async function authenticateCredentialsForLogin({ email, password }) {
  const e = normalizeEmail(email);
  const p = String(password || '');
  if (!e || !p) return { status: 'invalid' };
  const users = await readUsers();
  const user = users.find((u) => normalizeEmail(u?.email) === e && String(u?.provider || '') === 'credentials') || null;
  if (!user) return { status: 'invalid' };
  const ok = await verifyPassword(p, { salt: user.passwordSalt, hash: user.passwordHash });
  if (!ok) return { status: 'invalid' };
  if (!isEmailVerified(user)) return { status: 'unverified', email: user.email };
  return { status: 'ok', user: mapUser(user) };
}

export async function verifyCredentialsUser({ email, password }) {
  const auth = await authenticateCredentialsForLogin({ email, password });
  if (auth.status !== 'ok') return null;
  return auth.user;
}

export async function getCredentialsVerificationStatus(email) {
  const user = await findUserByEmail(email);
  if (!user || String(user.provider || '') !== 'credentials') return { status: 'not_found' };
  if (isEmailVerified(user)) return { status: 'verified' };
  return { status: 'pending' };
}

export async function confirmEmailByToken(plainToken) {
  const hash = hashVerificationToken(plainToken);
  const users = await readUsers();
  const user = users.find((u) => String(u?.verificationTokenHash || '') === hash) || null;
  if (!user) throw Object.assign(new Error('Invalid token'), { code: 'INVALID_TOKEN' });
  if (isVerificationExpired(user.verificationExpiresAt)) {
    throw Object.assign(new Error('Token expired'), { code: 'TOKEN_EXPIRED' });
  }
  user.emailVerified = true;
  user.verificationTokenHash = null;
  user.verificationCodeHash = null;
  user.verificationExpiresAt = null;
  await writeUsers(users);
  return mapUser(user);
}

export async function confirmEmailByCode(email, plainCode) {
  const e = normalizeEmail(email);
  const code = normalizeVerificationCode(plainCode);
  if (!e || code.length !== 6) throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  const users = await readUsers();
  const user = users.find((u) => normalizeEmail(u?.email) === e && String(u?.provider || '') === 'credentials');
  if (!user) throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  if (isEmailVerified(user)) return mapUser(user);
  if (isVerificationExpired(user.verificationExpiresAt)) {
    throw Object.assign(new Error('Token expired'), { code: 'TOKEN_EXPIRED' });
  }
  const codeHash = hashVerificationToken(code);
  if (!user.verificationCodeHash || user.verificationCodeHash !== codeHash) {
    throw Object.assign(new Error('Invalid code'), { code: 'INVALID_CODE' });
  }
  user.emailVerified = true;
  user.verificationTokenHash = null;
  user.verificationCodeHash = null;
  user.verificationExpiresAt = null;
  await writeUsers(users);
  return mapUser(user);
}

export async function refreshVerificationToken(email, options = {}) {
  const e = normalizeEmail(email);
  if (!e) throw Object.assign(new Error('Email invalid'), { code: 'VALIDATION' });
  const users = await readUsers();
  const user = users.find((u) => normalizeEmail(u?.email) === e && String(u?.provider || '') === 'credentials');
  if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });
  if (isEmailVerified(user)) throw Object.assign(new Error('Already verified'), { code: 'ALREADY_VERIFIED' });
  const { tokenPlain, tokenHash, codePlain, codeHash, expiresAt } = createVerificationCredentials();
  user.verificationTokenHash = tokenHash;
  user.verificationCodeHash = codeHash;
  user.verificationExpiresAt = expiresAt;
  const trimmedName = String(options.name || '').trim();
  const p = String(options.password || '');
  if (p && p.length >= 6) {
    const { salt, hash: passHash } = await hashPassword(p);
    user.passwordSalt = salt;
    user.passwordHash = passHash;
  }
  if (trimmedName) user.name = trimmedName;
  await writeUsers(users);
  return { user: mapUser(user), verificationToken: tokenPlain, verificationCode: codePlain };
}

export async function upsertOAuthUser({ provider, providerAccountId, email, name, image }) {
  const p = String(provider || '').trim();
  const id = String(providerAccountId || '').trim();
  if (!p || !id) throw Object.assign(new Error('Account data required'), { code: 'VALIDATION' });

  const e = normalizeEmail(email);
  const users = await readUsers();
  const now = new Date().toISOString();

  const byAccount = users.find(
    (u) =>
      Array.isArray(u?.accounts) &&
      u.accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === id),
  );
  if (byAccount) {
    byAccount.email = e ?? byAccount.email ?? null;
    byAccount.name = String(name || '').trim() || byAccount.name || null;
    byAccount.image = String(image || '').trim() || byAccount.image || null;
    byAccount.emailVerified = true;
    await writeUsers(users);
    return mapUser(byAccount);
  }

  const byEmail = e ? users.find((u) => normalizeEmail(u?.email) === e) : null;
  if (byEmail) {
    if (String(byEmail?.provider || '') === 'credentials') {
      throw Object.assign(new Error('Email already exists, linking required'), { code: 'LINK_REQUIRED' });
    }
    const accounts = Array.isArray(byEmail.accounts) ? byEmail.accounts : [];
    if (!accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === id)) {
      accounts.push({ provider: p, providerAccountId: id, linkedAt: now });
    }
    byEmail.accounts = accounts;
    byEmail.image = String(image || '').trim() || byEmail.image || null;
    byEmail.name = String(name || '').trim() || byEmail.name || null;
    byEmail.emailVerified = true;
    await writeUsers(users);
    return mapUser(byEmail);
  }

  const newId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const next = {
    id: newId,
    name: String(name || '').trim() || null,
    email: e,
    image: String(image || '').trim() || null,
    createdAt: now,
    provider: p,
    emailVerified: true,
    accounts: [{ provider: p, providerAccountId: id, linkedAt: now }],
  };
  users.push(next);
  await writeUsers(users);
  return mapUser(next);
}

export async function linkOAuthAccountToEmail({ email, password, provider, providerAccountId, name, image }) {
  const e = normalizeEmail(email);
  const p = String(provider || '').trim();
  const id = String(providerAccountId || '').trim();
  if (!e || !p || !id) throw Object.assign(new Error('Invalid input'), { code: 'VALIDATION' });
  const user = await verifyCredentialsUser({ email: e, password });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { code: 'UNAUTHORIZED' });

  const users = await readUsers();
  const alreadyLinkedToOther = users.find(
    (u) =>
      u.id !== user.id &&
      Array.isArray(u?.accounts) &&
      u.accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === id),
  );
  if (alreadyLinkedToOther) throw Object.assign(new Error('Account already linked'), { code: 'CONFLICT' });

  const target = users.find((u) => u.id === user.id);
  if (!target) throw Object.assign(new Error('User missing'), { code: 'NOT_FOUND' });
  const now = new Date().toISOString();
  const accounts = Array.isArray(target.accounts) ? target.accounts : [];
  if (!accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === id)) {
    accounts.push({ provider: p, providerAccountId: id, linkedAt: now });
  }
  target.accounts = accounts;
  target.name = String(name || '').trim() || target.name || null;
  target.image = String(image || '').trim() || target.image || null;
  await writeUsers(users);
  return mapUser(target);
}
