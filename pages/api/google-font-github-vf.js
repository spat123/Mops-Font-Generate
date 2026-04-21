/**
 * Прокси полного variable TTF с raw.githubusercontent.com/google/fonts
 * (веб-сабсеты gstatic не содержат все оси в fvar — слайдеры из metadata не меняли глифы).
 */
import { getGoogleFontsMetadataFamilyList } from '../../utils/googleFontsMetadataServer';
import { slimGoogleMetadataAxes } from '../../utils/googleFontMetadataAxes';
import { buildGithubVariableTtfCandidateUrls } from '../../utils/googleGithubVariableFontUrl';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';

const UA = 'Mozilla/5.0 (compatible; MopsFontGenerate/1.0)';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  const family = typeof req.query.family === 'string' ? req.query.family.trim() : '';
  const italic = req.query.italic === '1' || req.query.italic === 'true';
  if (!family) {
    return res.status(400).json({ error: 'Query "family" is required' });
  }

  try {
    const list = await getGoogleFontsMetadataFamilyList();
    const entry = list.find((x) => x && x.family === family);
    if (!entry) {
      return res.status(404).json({ error: 'Family not found in Google metadata' });
    }
    const slim = slimGoogleMetadataAxes(entry.axes);
    if (!slim.length) {
      return res.status(404).json({ error: 'No axes in metadata' });
    }
    const tags = slim.map((a) => a.tag);
    const urls = buildGithubVariableTtfCandidateUrls(entry.family, tags, { italic });

    let buf = null;
    for (const url of urls) {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) {
        const b = Buffer.from(await r.arrayBuffer());
        if (b.length > 10_000) {
          buf = b;
          break;
        }
      }
    }

    if (!buf?.length) {
      return res.status(404).json({
        error: italic
          ? 'Italic variable TTF not found on GitHub (google/fonts)'
          : 'Full variable TTF not found on GitHub (google/fonts)',
      });
    }

    res.setHeader('Content-Type', 'font/ttf');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(buf);
  } catch (e) {
    console.error('[google-font-github-vf]', e);
    return res.status(502).json({ error: 'Failed to load font', details: e.message });
  }
}
