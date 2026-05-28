/**
 * Возвращает JSON со всеми @font-face (woff2 + unicode-range) из CSS Google Fonts.
 * Статика и VF: у Google часто несколько файлов woff2 с разными unicode-range — нужны все.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { parseGoogleFontStyleQuery, fetchGoogleFontCssFacesForFamily } from '../../utils/googleApiRouteHelpers';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  const family = typeof req.query.family === 'string' ? req.query.family : '';
  if (!family) {
    return res.status(400).json({ error: 'Query "family" is required' });
  }

  const style = parseGoogleFontStyleQuery(req.query);

  try {
    const result = await fetchGoogleFontCssFacesForFamily(family, style);
    if ('error' in result) {
      const status = result.status && result.status >= 400 && result.status < 600 ? result.status : 502;
      if (result.error.includes('No woff2')) {
        return res.status(404).json({ error: result.error });
      }
      return res.status(status).json({
        error: result.error,
        status: result.status,
      });
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).json({ faces: result.faces });
  } catch (e) {
    console.error('[google-font-faces]', e);
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'Internal error', details: message });
  }
}
