/**
 * Прокси загрузки файла шрифта Google Fonts (woff2) для клиента.
 * Запрос CSS выполняется на сервере с «браузерным» User-Agent, чтобы в ответе были woff2, а не TTF.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchWoff2BufferFromGoogleCss } from '../../utils/googleFontsCssShared';
import {
  buildGoogleFontsCss2UrlForWoff2Download,
  buildGoogleStaticFallbackCssUrl,
  parseGoogleFontStyleQuery,
  resolveGoogleFontCssContext,
} from '../../utils/googleApiRouteHelpers';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  const family = typeof req.query.family === 'string' ? req.query.family : '';
  if (!family) {
    return res.status(400).json({ error: 'Query "family" is required (e.g. Roboto, Open+Sans)' });
  }

  const style = parseGoogleFontStyleQuery(req.query);

  try {
    const ctx = await resolveGoogleFontCssContext(family, style.variable);
    const primaryUrl = buildGoogleFontsCss2UrlForWoff2Download(family, style, ctx);

    let result = await fetchWoff2BufferFromGoogleCss(primaryUrl);

    if ('error' in result && result.error && style.variable) {
      const fallbackUrl = buildGoogleStaticFallbackCssUrl(family, style);
      console.warn('[google-font] primary failed, try static', result.error, primaryUrl, '→', fallbackUrl);
      result = await fetchWoff2BufferFromGoogleCss(fallbackUrl);
    }

    if ('error' in result && result.error) {
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

    if (!('buf' in result)) {
      return res.status(502).json({ error: 'Unexpected fetch result' });
    }

    res.setHeader('Content-Type', 'font/woff2');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(result.buf);
  } catch (e) {
    console.error('[google-font]', e);
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'Internal error', details: message });
  }
}
