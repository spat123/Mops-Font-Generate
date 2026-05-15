import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from './passwords';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || null;
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
  const dir = path.dirname(USERS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export async function findUserByEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return null;
  const users = await readUsers();
  return users.find((u) => normalizeEmail(u?.email) === e) || null;
}

/** @param {string} id */
export async function findUserById(id) {
  const uid = String(id || '').trim();
  if (!uid) return null;
  const users = await readUsers();
  return users.find((u) => String(u?.id || '').trim() === uid) || null;
}

export async function findUserByAccount({ provider, providerAccountId }) {
  const p = String(provider || '').trim();
  const id = String(providerAccountId || '').trim();
  if (!p || !id) return null;
  const users = await readUsers();
  return (
    users.find((u) =>
      Array.isArray(u?.accounts) &&
      u.accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === id),
    ) || null
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
  if (existing) throw Object.assign(new Error('User exists'), { code: 'EXISTS' });

  const { salt, hash } = await hashPassword(p);
  const now = new Date().toISOString();
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const next = {
    id,
    name: trimmedName,
    email: e,
    createdAt: now,
    provider: 'credentials',
    passwordSalt: salt,
    passwordHash: hash,
    accounts: [],
  };
  users.push(next);
  await writeUsers(users);
  return next;
}

export async function verifyCredentialsUser({ email, password }) {
  const e = normalizeEmail(email);
  const p = String(password || '');
  if (!e || !p) return null;
  const users = await readUsers();
  const user = users.find((u) => normalizeEmail(u?.email) === e && String(u?.provider || '') === 'credentials') || null;
  if (!user) return null;
  const ok = await verifyPassword(p, { salt: user.passwordSalt, hash: user.passwordHash });
  if (!ok) return null;
  return user;
}

export async function upsertOAuthUser({ provider, providerAccountId, email, name, image }) {
  const p = String(provider || '').trim();
  const id = String(providerAccountId || '').trim();
  if (!p || !id) throw Object.assign(new Error('Account data required'), { code: 'VALIDATION' });

  const e = normalizeEmail(email);
  const users = await readUsers();
  const now = new Date().toISOString();

  const byAccount = users.find((u) =>
    Array.isArray(u?.accounts) &&
    u.accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === id),
  );
  if (byAccount) {
    byAccount.email = e ?? byAccount.email ?? null;
    byAccount.name = String(name || '').trim() || byAccount.name || null;
    byAccount.image = String(image || '').trim() || byAccount.image || null;
    await writeUsers(users);
    return byAccount;
  }

  const byEmail = e ? users.find((u) => normalizeEmail(u?.email) === e) : null;
  if (byEmail) {
    // Если email уже занят "credentials" аккаунтом — требуем подтверждение (привязку).
    if (String(byEmail?.provider || '') === 'credentials') {
      throw Object.assign(new Error('Email already exists, linking required'), { code: 'LINK_REQUIRED' });
    }
    // Для OAuth↔OAuth по одному email — связываем автоматически.
    const accounts = Array.isArray(byEmail.accounts) ? byEmail.accounts : [];
    if (!accounts.some((a) => String(a?.provider || '').trim() === p && String(a?.providerAccountId || '').trim() === id)) {
      accounts.push({ provider: p, providerAccountId: id, linkedAt: now });
    }
    byEmail.accounts = accounts;
    byEmail.image = String(image || '').trim() || byEmail.image || null;
    byEmail.name = String(name || '').trim() || byEmail.name || null;
    await writeUsers(users);
    return byEmail;
  }

  const newId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const next = {
    id: newId,
    name: String(name || '').trim() || null,
    email: e,
    image: String(image || '').trim() || null,
    createdAt: now,
    provider: p,
    accounts: [{ provider: p, providerAccountId: id, linkedAt: now }],
  };
  users.push(next);
  await writeUsers(users);
  return next;
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
  return target;
}

