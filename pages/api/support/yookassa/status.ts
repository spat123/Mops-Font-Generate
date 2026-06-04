import type { NextApiRequest, NextApiResponse } from 'next';
import { isYooKassaConfigured } from '../../../../utils/yookassaServer';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ enabled: isYooKassaConfigured() });
}
