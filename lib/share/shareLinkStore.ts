import crypto from 'crypto';
import { ensureUserSchema, getSql, isPostgresEnabled } from '../auth/db';

const SHARE_LINK_TTL_DAYS = 365;

function newShareLinkId() {
  return crypto.randomBytes(8).toString('base64url').replace(/[_-]/g, 'x').slice(0, 10);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (Number(payload.version) !== 1) return null;
  if (!Array.isArray(payload.items)) return null;
  return payload;
}

export async function createShareLink(payload) {
  const data = validatePayload(payload);
  if (!data) throw Object.assign(new Error('Invalid payload'), { code: 'VALIDATION' });
  if (!isPostgresEnabled()) {
    throw Object.assign(new Error('Postgres required'), { code: 'UNAVAILABLE' });
  }
  await ensureUserSchema();
  const sql = getSql();
  const id = newShareLinkId();
  const expiresAt = new Date(Date.now() + SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO share_links (id, payload, expires_at, created_at)
    VALUES (${id}, ${JSON.stringify(data)}::jsonb, ${expiresAt}, NOW())
  `;
  return { id, expiresAt };
}

export async function getShareLinkPayloadById(id) {
  const sid = String(id || '').trim();
  if (!sid || sid.length > 16) return null;
  if (!isPostgresEnabled()) return null;
  await ensureUserSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT payload, expires_at FROM share_links WHERE id = ${sid} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const expiresAt = row.expires_at ? Date.parse(String(row.expires_at)) : NaN;
  if (Number.isFinite(expiresAt) && expiresAt < Date.now()) return null;
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  return validatePayload(payload);
}
