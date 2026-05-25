import { confirmEmailByToken } from '../../../lib/auth/userStore';
import { deviceCookieHeader, trustDeviceForRequest } from '../../../lib/auth/loginStepUp';
import { issueLoginToken, isStepUpLoginAvailable } from '../../../lib/auth/stepUpLogin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  const base = String(process.env.NEXTAUTH_URL || '').replace(/\/$/, '') || '';

  const redirect = (status, setDeviceCookie, loginToken) => {
    const params = new URLSearchParams({ verified: status });
    if (loginToken) params.set('loginToken', loginToken);
    const path = `/auth/signin?${params.toString()}`;
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
    let loginToken = null;
    if (isStepUpLoginAvailable()) {
      loginToken = await issueLoginToken(user.id);
    }
    redirect('1', deviceCookieHeader(newDeviceId), loginToken);
  } catch (e) {
    if (e?.code === 'TOKEN_EXPIRED') {
      redirect('expired');
      return;
    }
    redirect('invalid');
  }
}
