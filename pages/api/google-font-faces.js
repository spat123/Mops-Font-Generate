/**
 * Возвращает JSON со всеми @font-face (woff2 + unicode-range) из CSS Google Fonts.
 * Статика и VF: у Google часто несколько файлов woff2 с разными unicode-range — нужны все.
 */
import { CHROME_UA, buildGoogleFontsCss2Url, parseGoogleFontFacesFromCss } from '../../utils/googleFontsCssShared';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const family = typeof req.query.family === 'string' ? req.query.family : '';
  if (!family) {
    return res.status(400).json({ error: 'Query "family" is required' });
  }

  const variable = req.query.variable !== 'false' && req.query.variable !== '0';
  const weight = req.query.weight;
  const italic = req.query.italic === '1' || req.query.italic === 'true';
  const wghtMin = req.query.wghtMin;
  const wghtMax = req.query.wghtMax;
  const subset = typeof req.query.subset === 'string' ? req.query.subset.trim() : '';

  const cssUrl = variable
    ? buildGoogleFontsCss2Url(family, { variable: true, wghtMin, wghtMax, subset: subset || undefined })
    : buildGoogleFontsCss2Url(family, { variable: false, weight, italic, subset: subset || undefined });

  try {
    const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': CHROME_UA } });
    if (!cssRes.ok) {
      return res.status(cssRes.status >= 400 && cssRes.status < 600 ? cssRes.status : 502).json({
        error: 'Failed to fetch Google Fonts CSS',
        status: cssRes.status,
      });
    }
    const css = await cssRes.text();
    const faces = parseGoogleFontFacesFromCss(css);
    if (!faces.length) {
      return res.status(404).json({ error: 'No woff2 faces in CSS response' });
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).json({ faces });
  } catch (e) {
    console.error('[google-font-faces]', e);
    return res.status(500).json({ error: 'Internal error', details: e.message });
  }
}
