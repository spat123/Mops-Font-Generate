/**
 * Оси одного семейства из metadata Google (для IndexedDB без googleFontAxesFromCatalog).
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { slimGoogleMetadataAxes } from '../../utils/googleFontMetadataAxes';
import { getGoogleMetadataFamilyEntry } from '../../utils/googleApiRouteHelpers';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  const family = typeof req.query.family === 'string' ? req.query.family.trim() : '';
  if (!family) {
    return res.status(400).json({ error: 'Query "family" is required (e.g. Roboto Flex)' });
  }

  try {
    const entry = await getGoogleMetadataFamilyEntry(family);
    if (!entry) {
      return res.status(404).json({ error: 'Family not found in Google metadata' });
    }
    const axes = slimGoogleMetadataAxes(entry.axes);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
    return res.status(200).json({ family: entry.family, axes });
  } catch (e) {
    console.error('[google-font-family-axes]', e);
    const message = e instanceof Error ? e.message : String(e);
    return res.status(502).json({ error: 'Failed to load Google metadata', details: message });
  }
}
