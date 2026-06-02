import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { findUserById } from './auth/userStore';
import { isDevUnlimitedStaticGeneration } from '../utils/devUnlimitedStaticGeneration';
import { hasOpenBetaFullAccess } from '../utils/openBetaAccess';
import {
  FREE_STATIC_GENERATIONS_LIMIT,
  GUEST_STATIC_GENERATIONS_LIMIT,
  getCurrentQuotaPeriod,
} from '../utils/freeStaticGenerationQuota';

function resolveQuotaFilePath() {
  if (process.env.STATIC_GENERATION_QUOTA_PATH) {
    return process.env.STATIC_GENERATION_QUOTA_PATH;
  }
  if (process.env.NODE_ENV === 'production') {
    return path.join(os.tmpdir(), 'dinamic-font', 'static-generation-quota.json');
  }
  return path.join(process.cwd(), 'data', 'static-generation-quota.json');
}

const QUOTA_FILE = resolveQuotaFilePath();

function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  if (forwarded) return forwarded;
  return String(req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown').trim();
}

function hashKey(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}

function buildQuotaSubjectKey(req, userId, guestQuotaId) {
  if (userId) return `user:${userId}`;
  const ip = getClientIp(req);
  const guest = String(guestQuotaId || '').trim().slice(0, 80);
  return `guest:${hashKey(ip)}:${hashKey(guest || ip)}`;
}

async function readStore() {
  try {
    const raw = await fs.readFile(QUOTA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return {};
    throw e;
  }
}

async function writeStore(store) {
  const dir = path.dirname(QUOTA_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(QUOTA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function getBucket(store, subjectKey) {
  const period = getCurrentQuotaPeriod();
  const entry = store[subjectKey];
  if (!entry || entry.period !== period) {
    return { period, used: 0 };
  }
  const used = Number.parseInt(String(entry.used ?? ''), 10);
  return { period, used: Number.isFinite(used) && used >= 0 ? used : 0 };
}

/**
 * Проверяет и списывает одну генерацию (не для probe и не для Pro).
 * @returns {Promise<{ ok: boolean, status?: number, limit?: number, used?: number, remaining?: number, period?: string, message?: string }>}
 */
export async function consumeStaticGenerationQuota(req, { userId, isPro, guestQuotaId, dryRun = false }) {
  if (
    hasOpenBetaFullAccess({ isAuthenticated: Boolean(userId), isPro }) ||
    isDevUnlimitedStaticGeneration()
  ) {
    return { ok: true, limit: Infinity, used: 0, remaining: Infinity, period: getCurrentQuotaPeriod() };
  }

  const limit = userId ? FREE_STATIC_GENERATIONS_LIMIT : GUEST_STATIC_GENERATIONS_LIMIT;
  const subjectKey = buildQuotaSubjectKey(req, userId, guestQuotaId);
  const store = await readStore();
  const bucket = getBucket(store, subjectKey);
  const remaining = Math.max(0, limit - bucket.used);

  if (bucket.used >= limit) {
    return {
      ok: false,
      status: 429,
      limit,
      used: bucket.used,
      remaining: 0,
      period: bucket.period,
      message: userId
        ? 'Вы исчерпали лимит генераций в этом месяце.'
        : 'Вы исчерпали лимит генераций. Войдите в аккаунт для большего лимита.',
    };
  }

  if (dryRun) {
    return {
      ok: true,
      limit,
      used: bucket.used,
      remaining: remaining,
      period: bucket.period,
    };
  }

  const nextUsed = bucket.used + 1;
  store[subjectKey] = { period: bucket.period, used: nextUsed, updatedAt: new Date().toISOString() };
  try {
    await writeStore(store);
  } catch (writeErr) {
    console.warn('[staticGenerationQuota] write failed (generation still allowed):', writeErr?.message || writeErr);
  }

  return {
    ok: true,
    limit,
    used: nextUsed,
    remaining: Math.max(0, limit - nextUsed),
    period: bucket.period,
  };
}

/** @param {import('next').NextApiRequest} req */
export async function resolveGenerationQuotaActor(req) {
  const { getToken } = await import('next-auth/jwt');
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const rawId = token?.userId != null ? String(token.userId) : '';
  const userId = rawId && !rawId.startsWith('pending:') ? rawId : null;
  let isPro = false;
  if (userId) {
    try {
      const rec = await findUserById(userId);
      isPro = String(rec?.plan || '').toLowerCase() === 'pro';
    } catch {
      isPro = false;
    }
    if (process.env.NODE_ENV === 'development' && String(process.env.DEV_PRO_SIMULATION || '').trim() === '1') {
      isPro = true;
    }
  }
  const guestQuotaId = String(req.headers['x-guest-quota-id'] || '').trim();
  return {
    userId,
    isPro: hasOpenBetaFullAccess({ isAuthenticated: Boolean(userId), isPro }),
    guestQuotaId,
  };
}
