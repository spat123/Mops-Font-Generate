import type { NextApiRequest, NextApiResponse } from 'next';
import { confirmEmailByToken } from '../../../lib/auth/userStore';
import { deviceCookieHeader, trustDeviceForRequest } from '../../../lib/auth/loginStepUp';
import { issueLoginToken, isStepUpLoginAvailable } from '../../../lib/auth/stepUpLogin';

type CodedError = { code?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = typeof req.query?.token === 'string' ? req.query.token : '';
  const base = String(process.env.NEXTAUTH_URL || '').replace(/\/$/, '') || '';

  const redirect = (status: string, setDeviceCookie?: string, loginToken?: string | null) => {
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
    let loginToken: string | null = null;
    if (isStepUpLoginAvailable()) {
      loginToken = await issueLoginToken(user.id);
    }
    redirect('1', deviceCookieHeader(newDeviceId), loginToken);
  } catch (e) {
    const err = e as CodedError;
    if (err?.code === 'TOKEN_EXPIRED') {
      redirect('expired');
      return;
    }
    redirect('invalid');
  }
}
