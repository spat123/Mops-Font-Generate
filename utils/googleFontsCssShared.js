/**
 * Общая логика URL CSS Google Fonts и разбор @font-face (сервер + при необходимости клиент).
 */

export const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * @param {string} family
 * @param {{ variable?: boolean, weight?: string|number, italic?: boolean, wghtMin?: number|string, wghtMax?: number|string, subset?: string }} opts
 *   subset — через запятую коды subset (latin,limbu,…), как в Google Fonts CSS2.
 */
export function buildGoogleFontsCss2Url(family, { variable, weight, italic, wghtMin, wghtMax, subset }) {
  const name = String(family).trim().replace(/\s+/g, '+');
  const subsetQs =
    typeof subset === 'string' && subset.trim()
      ? `&subset=${subset
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(',')}`
      : '';
  if (variable) {
    const wMin = Number.isFinite(Number(wghtMin))
      ? Math.max(1, Math.min(1000, Math.round(Number(wghtMin))))
      : 100;
    let wMax = Number.isFinite(Number(wghtMax))
      ? Math.max(1, Math.min(1000, Math.round(Number(wghtMax))))
      : 1000;
    if (wMax < wMin) wMax = wMin;
    return `https://fonts.googleapis.com/css2?family=${name}:ital,wght@0,${wMin}..${wMax};1,${wMin}..${wMax}&display=swap${subsetQs}`;
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
