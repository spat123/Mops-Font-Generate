/**
 * Оси одного семейства из metadata Google (для IndexedDB без googleFontAxesFromCatalog).
 */
import { slimGoogleMetadataAxes } from '../../utils/googleFontMetadataAxes';
import { getGoogleFontsMetadataFamilyList } from '../../utils/googleFontsMetadataServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const family = typeof req.query.family === 'string' ? req.query.family.trim() : '';
  if (!family) {
    return res.status(400).json({ error: 'Query "family" is required (e.g. Roboto Flex)' });
  }

  try {
    const list = await getGoogleFontsMetadataFamilyList();
    const entry = list.find((x) => x && x.family === family);
    if (!entry) {
      return res.status(404).json({ error: 'Family not found in Google metadata' });
    }
    const axes = slimGoogleMetadataAxes(entry.axes);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
    return res.status(200).json({ family: entry.family, axes });
  } catch (e) {
    console.error('[google-font-family-axes]', e);
    return res.status(502).json({ error: 'Failed to load Google metadata', details: e.message });
  }
}
