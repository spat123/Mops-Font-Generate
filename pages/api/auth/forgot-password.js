import { isPostgresEnabled } from '../../../lib/auth/db';
import { issuePasswordResetForEmail } from '../../../lib/auth/userStore';
import { sendPasswordResetEmail } from '../../../lib/auth/sendPasswordResetEmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (process.env.VERCEL && !isPostgresEnabled()) {
    res.status(503).json({ error: 'Service unavailable' });
    return;
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  try {
    if (email && email.includes('@')) {
      const result = await issuePasswordResetForEmail(email);
      if (result?.resetToken) {
        try {
          await sendPasswordResetEmail({
            to: result.user.email,
            name: result.user.name,
            token: result.resetToken,
          });
        } catch (mailErr) {
          if (mailErr?.code === 'EMAIL_FAILED') {
            console.error('[forgot-password] email failed for', email);
          } else {
            throw mailErr;
          }
        }
      }
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[forgot-password]', e);
    res.status(200).json({ ok: true });
  }
}
