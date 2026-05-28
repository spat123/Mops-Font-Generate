/**
 * Прокси каталога Google Fonts (metadata) — один раз с сервера, кэш.
 * Источник: https://fonts.google.com/metadata/fonts
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchGoogleFamilyTagsMaps } from '../../utils/googleFontFamilyTags';
import { buildGoogleCatalogItems } from '../../utils/googleFontsCatalogSlim';
import { getGoogleFontsMetadataFamilyList } from '../../utils/googleFontsMetadataServer';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  try {
    const [list, tagsMaps] = await Promise.all([
      getGoogleFontsMetadataFamilyList(),
      fetchGoogleFamilyTagsMaps().catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[google-fonts-catalog] tags CSV failed:', message);
        return {
          feelingsByFamily: new Map(),
          shapesByFamily: new Map(),
          calligraphyByFamily: new Map(),
          hasSlabByFamily: new Map(),
        };
      }),
    ]);

    const items = buildGoogleCatalogItems(list, tagsMaps);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
    return res.status(200).json({ items });
  } catch (e) {
    console.error('[google-fonts-catalog]', e);
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes('Google metadata') ? 502 : 500;
    return res.status(status).json({
      error: status === 502 ? 'Не удалось получить каталог Google Fonts' : 'Internal error',
      details: message,
    });
  }
}
