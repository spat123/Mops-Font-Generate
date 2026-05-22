import { getDatabaseUrl, getSql, ensureUserSchema, isPostgresEnabled, getDatabaseDriver } from '../../../lib/auth/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }

  const hasSecret = Boolean(String(process.env.NEXTAUTH_SECRET || '').trim());
  const hasUrl = Boolean(String(process.env.NEXTAUTH_URL || '').trim());
  const url = getDatabaseUrl();
  let dbOk = false;
  let dbError = null;

  if (isPostgresEnabled()) {
    try {
      await ensureUserSchema();
      const sql = getSql();
      const rows = await sql`SELECT 1 AS ok`;
      dbOk = Array.isArray(rows) ? rows.length > 0 : Boolean(rows);
    } catch (e) {
      dbError = (e?.message || String(e)).slice(0, 300);
    }
  }

  res.status(200).json({
    ok: hasSecret && hasUrl && (!isPostgresEnabled() || dbOk),
    hasNextAuthSecret: hasSecret,
    hasNextAuthUrl: hasUrl,
    authTrustHostEnv: String(process.env.AUTH_TRUST_HOST || '').trim() === 'true',
    runtime: process.versions?.bun ? 'bun' : 'node',
    database: {
      configured: isPostgresEnabled(),
      driver: url ? getDatabaseDriver(url) : null,
      ok: dbOk,
      error: dbError,
    },
  });
}
