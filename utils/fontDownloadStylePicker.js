import { findStyleInfoByWeightAndStyle } from './fontUtilsCommon';
import { listGoogleCatalogDownloadStyles } from './googleFontDownloadStyles';
import {
  downloadFontsourceStylesAsFormat,
  downloadGoogleStylesAsFormat,
  downloadLocalStylesAsFormat,
} from './catalogDownloadActions';

const DOWNLOAD_FORMATS = ['woff2', 'ttf', 'otf', 'woff'];

/**
 * @typedef {{ id: string, weight: number, style: 'normal'|'italic', label: string }} FontDownloadStyleOption
 */

/**
 * @param {{ weights?: number[], styles?: string[] } | null | undefined} item
 * @returns {FontDownloadStyleOption[]}
 */
export function listFontsourceDownloadStyles(item) {
  if (!item || item.isVariable === true) return [];
  const weights = Array.isArray(item.weights)
    ? item.weights.map((w) => Number(w)).filter((w) => Number.isFinite(w))
    : [400];
  const styleKeys = Array.isArray(item.styles)
    ? item.styles.map((s) => String(s || '').trim()).filter(Boolean)
    : ['normal'];
  const out = [];
  const seen = new Set();
  for (const weight of weights) {
    for (const styleKey of styleKeys) {
      const style = styleKey === 'italic' ? 'italic' : 'normal';
      const sig = `${weight}:${style}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      const info = findStyleInfoByWeightAndStyle(weight, style);
      out.push({
        id: sig,
        weight,
        style,
        label: info?.name || `${weight} ${style}`,
      });
    }
  }
  out.sort((a, b) => a.weight - b.weight || (a.style === b.style ? 0 : a.style === 'italic' ? 1 : -1));
  return out;
}

/**
 * @param {object | null | undefined} sessionFont
 * @returns {FontDownloadStyleOption[]}
 */
export function listLocalDownloadStyles(sessionFont) {
  if (!sessionFont) return [];
  const fromList = Array.isArray(sessionFont.availableStyles) ? sessionFont.availableStyles : [];
  if (fromList.length > 0) {
    return fromList
      .map((row, index) => {
        const weight = Number(row?.weight);
        const style = row?.style === 'italic' ? 'italic' : 'normal';
        if (!Number.isFinite(weight)) return null;
        const label = String(row?.name || '').trim() || findStyleInfoByWeightAndStyle(weight, style).name;
        return { id: `local-${index}-${weight}-${style}`, weight, style, label };
      })
      .filter(Boolean);
  }
  const weight = Number(sessionFont.currentWeight);
  const style = sessionFont.currentStyle === 'italic' ? 'italic' : 'normal';
  const w = Number.isFinite(weight) ? weight : 400;
  const info = findStyleInfoByWeightAndStyle(w, style);
  return [{ id: 'local-0', weight: w, style, label: info?.name || 'Regular' }];
}

/**
 * Проп `stylePicker` для CatalogDownloadSplitButton.
 * @returns {object | null}
 */
export function buildGoogleStylePickerProps(entry) {
  const family = String(entry?.family || '').trim();
  let styles = listGoogleCatalogDownloadStyles(entry);
  if (styles.length === 0 && entry?.isVariable !== true && Number(entry?.styleCount) > 0) {
    styles = [{ id: '400', weight: 400, style: 'normal', label: 'Regular' }];
  }
  if (!family || styles.length === 0) return null;
  return {
    familyLabel: family,
    styles,
    formats: DOWNLOAD_FORMATS,
    onDownload: (selected, format) => downloadGoogleStylesAsFormat(entry, selected, format),
  };
}

export function buildFontsourceStylePickerProps(item) {
  const family = String(item?.family || item?.slug || '').trim();
  const styles = listFontsourceDownloadStyles(item);
  if (!family || styles.length === 0) return null;
  return {
    familyLabel: family,
    styles,
    formats: DOWNLOAD_FORMATS,
    onDownload: (selected, format) => downloadFontsourceStylesAsFormat(item, selected, format),
  };
}

export function buildLocalStylePickerProps(sessionFont, label) {
  const styles = listLocalDownloadStyles(sessionFont);
  if (styles.length === 0 || !(sessionFont?.file instanceof Blob)) return null;
  const familyLabel = String(label || sessionFont?.name || 'Локальный шрифт').trim();
  return {
    familyLabel,
    styles,
    formats: DOWNLOAD_FORMATS,
    onDownload: (selected, format) => downloadLocalStylesAsFormat(sessionFont, selected, format, familyLabel),
  };
}
