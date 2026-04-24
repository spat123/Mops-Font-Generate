/**
 * Подключает превью начертания с fonts.googleapis.com (лёгкий CSS, не woff2 в приложение).
 */

import { buildGoogleFontPreviewText } from './googleFontCatalogSampleText';
import { FULL_LATIN_ALPHANUM } from './googleFontCatalogSampleText';

function buildGooglePreviewRequestText(entry) {
  // Для live-preview в ROW нужны все латинские glyphs, иначе буквы вне AaBbCcDdEe
  // рендерятся fallback-шрифтом (например, F/S при вводе).
  const base = `${buildGoogleFontPreviewText(entry)}${FULL_LATIN_ALPHANUM}`;
  const familyText = String(entry?.family || '').trim();
  if (!familyText) return base;
  return `${base} ${familyText}`;
}

function previewHref(entry) {
  const fam = encodeURIComponent(entry.family);
  const text = encodeURIComponent(buildGooglePreviewRequestText(entry));
  if (entry.wghtMin != null && entry.wghtMax != null) {
    return `https://fonts.googleapis.com/css2?family=${fam}:wght@${entry.wghtMin}..${entry.wghtMax}&display=swap&text=${text}`;
  }
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@400&display=swap&text=${text}`;
}

const injected = new Map(); // family -> HTMLLinkElement

export function ensureGoogleFontPreviewCss(entry) {
  if (!entry?.family || typeof document === 'undefined') return;
  if (injected.has(entry.family)) return;
  const href = previewHref(entry);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.gfPreview = entry.family;
  link.onerror = () => {
    try {
      link.remove();
    } catch {
      /* ignore */
    }
    injected.delete(entry.family);
  };
  document.head.appendChild(link);
  injected.set(entry.family, link);
}

export function removeAllGoogleFontPreviewCss() {
  if (typeof document === 'undefined') return;
  injected.forEach((link) => {
    try {
      link.remove();
    } catch {
      /* ignore */
    }
  });
  injected.clear();
  document.querySelectorAll('link[data-gf-preview]').forEach((el) => {
    try {
      el.remove();
    } catch {
      /* ignore */
    }
  });
}
