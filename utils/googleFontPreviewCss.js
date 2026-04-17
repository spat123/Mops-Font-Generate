/**
 * Подключает превью начертания с fonts.googleapis.com (лёгкий CSS, не woff2 в приложение).
 */

import { buildGoogleFontPreviewText } from './googleFontCatalogSampleText';

function previewHref(entry) {
  const fam = encodeURIComponent(entry.family);
  const text = encodeURIComponent(buildGoogleFontPreviewText(entry));
  const subs = Array.isArray(entry.subsets)
    ? entry.subsets
        .map((s) => String(s || '').trim().toLowerCase())
        .filter((s) => s && s !== 'menu')
        .join(',')
    : '';
  const subsetQs = subs ? `&subset=${encodeURIComponent(subs)}` : '';
  if (entry.wghtMin != null && entry.wghtMax != null) {
    return `https://fonts.googleapis.com/css2?family=${fam}:wght@${entry.wghtMin}..${entry.wghtMax}&display=swap&text=${text}${subsetQs}`;
  }
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@400&display=swap&text=${text}${subsetQs}`;
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
