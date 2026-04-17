/**
 * Прокси загрузки файла шрифта Google Fonts (woff2) для клиента.
 * Запрос CSS выполняется на сервере с «браузерным» User-Agent, чтобы в ответе были woff2, а не TTF.
 */
import { CHROME_UA, buildGoogleFontsCss2Url, parseGoogleFontFacesFromCss } from '../../utils/googleFontsCssShared';

/**
 * Скачивает первый woff2 из CSS Google Fonts.
 * @returns {{ buf: Buffer } | { error: string, status?: number }}
 */
async function fetchWoff2BufferFromGoogleCss(cssUrl) {
  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': CHROME_UA } });
  if (!cssRes.ok) {
    return { error: 'Failed to fetch Google Fonts CSS', status: cssRes.status };
  }
  const css = await cssRes.text();
  const faces = parseGoogleFontFacesFromCss(css);
  if (!faces.length) {
    return { error: 'No woff2 URL found in CSS response' };
  }
  const fontUrl = faces[0].url;
  const fontRes = await fetch(fontUrl, { headers: { 'User-Agent': CHROME_UA } });
  if (!fontRes.ok) {
    return { error: 'Failed to fetch font file', status: fontRes.status };
  }
  const buf = Buffer.from(await fontRes.arrayBuffer());
  if (!buf.length) {
    return { error: 'Empty font response' };
  }
  return { buf };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const family = typeof req.query.family === 'string' ? req.query.family : '';
  if (!family) {
    return res.status(400).json({ error: 'Query "family" is required (e.g. Roboto, Open+Sans)' });
  }

  const variable = req.query.variable !== 'false' && req.query.variable !== '0';
  const weight = req.query.weight;
  const italic = req.query.italic === '1' || req.query.italic === 'true';
  const wghtMin = req.query.wghtMin;
  const wghtMax = req.query.wghtMax;

  const primaryUrl = buildGoogleFontsCss2Url(family, { variable, weight, italic, wghtMin, wghtMax });

  try {
    let result = await fetchWoff2BufferFromGoogleCss(primaryUrl);

    /* Многие семейства не вариативные в CSS2 — при ошибке или без woff2 пробуем статический 400. */
    if (result.error && variable) {
      const fallbackUrl = buildGoogleFontsCss2Url(family, {
        variable: false,
        weight: weight || '400',
        italic: italic || false,
      });
      console.warn('[google-font] primary failed, try static', result.error, primaryUrl, '→', fallbackUrl);
      result = await fetchWoff2BufferFromGoogleCss(fallbackUrl);
    }

    if (result.error) {
      const status = result.status && result.status >= 400 && result.status < 600 ? result.status : 502;
      if (result.error.includes('No woff2')) {
        return res.status(404).json({ error: result.error });
      }
      console.error('[google-font]', result.error, primaryUrl);
      return res.status(status >= 400 && status < 600 ? status : 502).json({
        error: result.error,
        status: result.status,
      });
    }

    res.setHeader('Content-Type', 'font/woff2');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(result.buf);
  } catch (e) {
    console.error('[google-font]', e);
    return res.status(500).json({ error: 'Internal error', details: e.message });
  }
}
