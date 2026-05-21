import { confirmEmailByToken } from '../../../lib/auth/userStore';
import { deviceCookieHeader, trustDeviceForRequest } from '../../../lib/auth/loginStepUp';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  const base = String(process.env.NEXTAUTH_URL || '').replace(/\/$/, '') || '';

  const redirect = (status, setDeviceCookie) => {
    const path = `/auth/signin?verified=${status}`;
    const url = base ? `${base}${path}` : path;
    if (setDeviceCookie) {
      res.setHeader('Set-Cookie', setDeviceCookie);
    }
    res.redirect(302, url);
  };

  if (!token) {
    redirect('missing');
    return;
  }

  try {
    const user = await confirmEmailByToken(token);
    const { newDeviceId } = await trustDeviceForRequest(req, user.id);
    redirect('1', deviceCookieHeader(newDeviceId));
  } catch (e) {
    if (e?.code === 'TOKEN_EXPIRED') {
      redirect('expired');
      return;
    }
    redirect('invalid');
  }
}
