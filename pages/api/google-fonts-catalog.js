/**
 * Прокси каталога Google Fonts (metadata) — один раз с сервера, кэш.
 * Источник: https://fonts.google.com/metadata/fonts
 */
import { resolveGoogleMetadataItalicMode, slimGoogleMetadataAxes } from '../../utils/googleFontMetadataAxes';
import { jsonMethodNotAllowed } from '../../utils/apiResponse';

const SOURCE = 'https://fonts.google.com/metadata/fonts';

function slimEntry(x) {
  const axes = Array.isArray(x.axes) ? x.axes : [];
  const wght = axes.find((a) => a.tag === 'wght');
  const variableWght =
    wght && typeof wght.min === 'number' && typeof wght.max === 'number' && wght.max > wght.min;
  /** В metadata Google у многих семейств есть `axes`, даже если min===max (фактически статика). */
  const hasVariableAxis = axes.some(
    (a) =>
      a &&
      typeof a.min === 'number' &&
      typeof a.max === 'number' &&
      a.max > a.min,
  );
  const fontsObj = x.fonts && typeof x.fonts === 'object' && !Array.isArray(x.fonts) ? x.fonts : {};
  const styleKeys = Object.keys(fontsObj);
  const hasItalicStyles = styleKeys.some((k) => /^\d+i$/.test(k));
  const subsets = Array.isArray(x.subsets) ? x.subsets.filter((s) => s && s !== 'menu') : [];
  /** Полные оси из metadata — в поднаборах woff2 с gstatic часто в fvar только wght; UI берёт оси отсюда. */
  const axesFull = slimGoogleMetadataAxes(axes);
  const italicMode = resolveGoogleMetadataItalicMode(axes, fontsObj);
  return {
    family: x.family,
    category: x.category || '',
    stroke: typeof x.stroke === 'string' ? x.stroke : '',
    defaultSort: typeof x.defaultSort === 'number' ? x.defaultSort : typeof x.popularity === 'number' ? x.popularity : 999999,
    wghtMin: variableWght ? Math.round(wght.min) : null,
    wghtMax: variableWght ? Math.round(wght.max) : null,
    isVariable: hasVariableAxis,
    axes: axesFull,
    subsets,
    styleCount: styleKeys.length,
    hasItalic: hasItalicStyles,
    hasItalicStyles,
    italicMode,
    primaryScript: typeof x.primaryScript === 'string' ? x.primaryScript : '',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return jsonMethodNotAllowed(res, 'GET');
  }

  try {
    const r = await fetch(SOURCE, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MopsFontGenerate/1.0)' },
    });
    if (!r.ok) {
      console.error('[google-fonts-catalog]', r.status);
      return res.status(502).json({ error: 'Не удалось получить каталог Google Fonts', status: r.status });
    }
    const text = await r.text();
    const data = JSON.parse(text);
    const list = Array.isArray(data.familyMetadataList) ? data.familyMetadataList : [];
    const items = list.map(slimEntry).sort((a, b) => a.defaultSort - b.defaultSort);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');
    return res.status(200).json({ items });
  } catch (e) {
    console.error('[google-fonts-catalog]', e);
    return res.status(500).json({ error: 'Internal error', details: e.message });
  }
}
