import type { NextApiRequest, NextApiResponse } from 'next';
import { getCredentialsVerificationStatus } from '../../../lib/auth/userStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const status = await getCredentialsVerificationStatus(email);
  res.status(200).json({
    status: status.status,
    needsVerification: status.status === 'pending',
  });
}
