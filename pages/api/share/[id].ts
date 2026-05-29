import type { NextApiRequest, NextApiResponse } from 'next';
import { getShareLinkPayloadById } from '../../../lib/share/shareLinkStore';

/** GET /api/share/:id — payload короткой ссылки (клиентская навигация на /share?id=). */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const id = String(req.query.id || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  try {
    const payload = await getShareLinkPayloadById(id);
    if (!payload) {
      res.status(404).json({ error: 'Not found or expired' });
      return;
    }
    res.status(200).json({ ok: true, id, payload });
  } catch (e) {
    console.error('[share/[id]]', e);
    res.status(500).json({ error: 'Internal error' });
  }
}
