/**
 * Общая логика URL CSS Google Fonts и разбор @font-face (сервер + при необходимости клиент).
 */

export const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * @param {string} family
 * @param {{
 *   variable?: boolean,
 *   weight?: string|number,
 *   italic?: boolean,
 *   wghtMin?: number|string,
 *   wghtMax?: number|string,
 *   subset?: string,
 *   axes?: { tag: string, min?: number, max?: number, defaultValue?: number }[],
 *   italicMode?: 'none'|'axis-ital'|'axis-slnt'|'separate-style'|string,
 * }} opts
 *   subset — через запятую коды subset (latin,limbu,…), как в Google Fonts CSS2.
 */
export function buildGoogleFontsCss2Url(
  family,
  { variable, weight, italic, wghtMin, wghtMax, subset, axes, italicMode },
) {
  const name = String(family).trim().replace(/\s+/g, '+');
  const subsetQs =
    typeof subset === 'string' && subset.trim()
      ? `&subset=${subset
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(',')}`
      : '';
  const axisList = Array.isArray(axes) ? axes.filter((axis) => axis && typeof axis.tag === 'string') : [];
  const axisMap = axisList.reduce((acc, axis) => {
    acc[axis.tag] = axis;
    return acc;
  }, {});

  const clampAxisRange = (tag, rawMin, rawMax, fallbackMin, fallbackMax) => {
    const axis = axisMap[tag];
    let min = Number.isFinite(Number(rawMin)) ? Number(rawMin) : Number(fallbackMin);
    let max = Number.isFinite(Number(rawMax)) ? Number(rawMax) : Number(fallbackMax);
    if (!Number.isFinite(min) && Number.isFinite(max)) min = max;
    if (!Number.isFinite(max) && Number.isFinite(min)) max = min;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [undefined, undefined];
    if (axis && Number.isFinite(Number(axis.min)) && Number.isFinite(Number(axis.max))) {
      const axisMin = Math.min(Number(axis.min), Number(axis.max));
      const axisMax = Math.max(Number(axis.min), Number(axis.max));
      min = Math.min(axisMax, Math.max(axisMin, min));
      max = Math.min(axisMax, Math.max(axisMin, max));
    }
    if (max < min) max = min;
    return [min, max];
  };

  if (variable) {
    const variableAxes = axisList.filter((axis) => {
      const min = Number(axis?.min);
      const max = Number(axis?.max);
      return Number.isFinite(min) && Number.isFinite(max) && max > min;
    });

    if (!variableAxes.length) {
      const w = String(weight || '400');
      if (italic) {
        return `https://fonts.googleapis.com/css2?family=${name}:ital,wght@1,${w}&display=swap${subsetQs}`;
      }
      return `https://fonts.googleapis.com/css2?family=${name}:wght@${w}&display=swap${subsetQs}`;
    }

    const axisTags = variableAxes.map((axis) => axis.tag);
    const includeItalAxis = italicMode === 'axis-ital' && axisTags.includes('ital');
    const rangeTags = variableAxes
      .map((axis) => axis.tag)
      .filter((tag) => tag !== 'ital')
      .sort((a, b) => a.localeCompare(b));
    const orderedTags = includeItalAxis ? ['ital', ...rangeTags] : rangeTags;

    const buildRangeToken = (tag) => {
      if (tag === 'wght') {
        const [min, max] = clampAxisRange(tag, wghtMin, wghtMax, axisMap.wght?.min ?? 100, axisMap.wght?.max ?? 900);
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
        return `${Math.round(min)}..${Math.round(max)}`;
      }
      const axis = axisMap[tag];
      const [min, max] = clampAxisRange(tag, axis?.min, axis?.max, axis?.min, axis?.max);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
      if (Math.round(min) === Math.round(max)) return `${Math.round(min)}`;
      return `${Math.round(min)}..${Math.round(max)}`;
    };

    const rangeValues = orderedTags.map((tag) => buildRangeToken(tag));
    if (rangeValues.some((value) => !value)) {
      return `https://fonts.googleapis.com/css2?family=${name}&display=swap${subsetQs}`;
    }

    if (includeItalAxis) {
      const romanTuple = ['0', ...rangeValues];
      const italicTuple = ['1', ...rangeValues];
      return `https://fonts.googleapis.com/css2?family=${name}:${orderedTags.join(',')}@${romanTuple.join(',')};${italicTuple.join(',')}&display=swap${subsetQs}`;
    }

    return `https://fonts.googleapis.com/css2?family=${name}:${orderedTags.join(',')}@${rangeValues.join(',')}&display=swap${subsetQs}`;
  }
  const w = String(weight || '400');
  if (italic) {
    return `https://fonts.googleapis.com/css2?family=${name}:ital,wght@1,${w}&display=swap${subsetQs}`;
  }
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${w}&display=swap${subsetQs}`;
}

/**
 * Извлекает из ответа Google Fonts CSS все @font-face с woff2 на gstatic (порядок как в CSS).
 * @param {string} cssText
 * @returns {{ url: string, unicodeRange: string|null, weight: string, style: string }[]}
 */
export function parseGoogleFontFacesFromCss(cssText) {
  if (!cssText || typeof cssText !== 'string') return [];
  /** Ключ url|weight|style — у одного woff2 может быть несколько unicode-range в разных @font-face */
  const merged = new Map();
  const blockRe = /@font-face\s*\{([\s\S]*?)\}/gi;
  let m;
  while ((m = blockRe.exec(cssText)) !== null) {
    const block = m[1];
    const urlM = /url\s*\(\s*(['"]?)(https:\/\/fonts\.gstatic\.com\/[^'")\s]+\.woff2)\1\s*\)/i.exec(block);
    if (!urlM) continue;
    const url = urlM[2];

    let unicodeRange = null;
    const urM = /unicode-range:\s*([^;]+);/i.exec(block);
    if (urM) unicodeRange = urM[1].trim();

    let weight = '400';
    const wM = /font-weight:\s*([^;]+);/i.exec(block);
    if (wM) weight = wM[1].trim().split(/\s+/)[0];

    let style = 'normal';
    const sM = /font-style:\s*([^;]+);/i.exec(block);
    if (sM) {
      const raw = sM[1].trim().toLowerCase();
      style = raw.startsWith('italic') ? 'italic' : 'normal';
    }

    const key = `${url}|${weight}|${style}`;
    const prev = merged.get(key);
    if (prev) {
      if (unicodeRange && prev.unicodeRange) {
        prev.unicodeRange = `${prev.unicodeRange}, ${unicodeRange}`;
      } else if (unicodeRange && !prev.unicodeRange) {
        prev.unicodeRange = unicodeRange;
      }
      continue;
    }
    merged.set(key, { url, unicodeRange, weight, style });
  }
  return [...merged.values()];
}
