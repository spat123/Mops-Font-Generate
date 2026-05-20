import { confirmEmailByToken } from '../../../lib/auth/userStore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  const base = String(process.env.NEXTAUTH_URL || '').replace(/\/$/, '') || '';

  const redirect = (status) => {
    const path = `/auth/signin?verified=${status}`;
    const url = base ? `${base}${path}` : path;
    res.redirect(302, url);
  };

  if (!token) {
    redirect('missing');
    return;
  }

  try {
    await confirmEmailByToken(token);
    redirect('1');
  } catch (e) {
    if (e?.code === 'TOKEN_EXPIRED') {
      redirect('expired');
      return;
    }
    redirect('invalid');
  }
}
