import { neon } from '@neondatabase/serverless';

let sqlClient = null;
let schemaReady = null;

export function getDatabaseUrl() {
  return String(process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim() || null;
}

export function isPostgresEnabled() {
  return Boolean(getDatabaseUrl());
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!sqlClient) sqlClient = neon(url);
  return sqlClient;
}

export async function ensureUserSchema() {
  const sql = getSql();
  if (!sql) return false;
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        provider TEXT NOT NULL DEFAULT 'credentials',
        password_salt TEXT,
        password_hash TEXT,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verification_token_hash TEXT,
        verification_expires_at TIMESTAMPTZ,
        image TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        accounts JSONB NOT NULL DEFAULT '[]'::jsonb
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email))`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_hash TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ`;
    await sql`
      CREATE TABLE IF NOT EXISTS trusted_devices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_hash TEXT NOT NULL,
        device_label TEXT,
        expires_at TIMESTAMPTZ,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS trusted_devices_user_hash_idx ON trusted_devices (user_id, device_hash)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS trusted_devices_user_hash_unique ON trusted_devices (user_id, device_hash)`;
    await sql`
      CREATE TABLE IF NOT EXISTS login_challenges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        device_hash TEXT,
        attempts INT NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS login_challenges_user_idx ON login_challenges (user_id)`;
    await sql`
      CREATE TABLE IF NOT EXISTS login_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        used_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    return true;
  })();
  return schemaReady;
}
