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
    return true;
  })();
  return schemaReady;
}
