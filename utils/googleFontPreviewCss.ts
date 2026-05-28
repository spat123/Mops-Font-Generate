/**
 * Подключает превью начертания с fonts.googleapis.com (лёгкий CSS, не woff2 в приложение).
 */

import {
  buildGoogleFontPreviewText,
  FULL_LATIN_ALPHANUM,
  LATIN_PREVIEW,
  type GoogleCatalogSampleEntry,
} from './googleFontCatalogSampleText';

const MAX_GOOGLE_TEXT_PARAM_LEN = 900;

export type GooglePreviewCatalogEntry = GoogleCatalogSampleEntry & {
  family?: string;
  wghtMin?: number;
  wghtMax?: number;
};

/** Уникальные символы для параметра &text= (без дубликатов, порядок сохраняем). */
export function mergePreviewGlyphChars(...parts: Array<string | null | undefined>): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    for (const char of String(part ?? '')) {
      if (seen.has(char)) continue;
      seen.add(char);
      out.push(char);
    }
  }
  return out.join('');
}

/**
 * Минимальный &text= для превью «Имя» на карточке: только символы названия + короткий латинский образец.
 */
export function buildGoogleNamePreviewRequestText(
  entry: GooglePreviewCatalogEntry | null | undefined,
): string {
  const familyText = String(entry?.family || '').trim();
  let merged = mergePreviewGlyphChars(familyText, LATIN_PREVIEW);
  if (merged.length > MAX_GOOGLE_TEXT_PARAM_LEN) {
    merged = merged.slice(0, MAX_GOOGLE_TEXT_PARAM_LEN);
  }
  return merged;
}

/**
 * Строка для &text= в CSS Google: базовые subset-глифы + UI-превью (свой текст / панграмма).
 */
export function buildGooglePreviewRequestText(
  entry: GooglePreviewCatalogEntry | null | undefined,
  uiPreviewText?: string | null,
): string {
  const ui = String(uiPreviewText ?? '').trim();
  if (!ui) {
    return buildGoogleNamePreviewRequestText(entry);
  }

  const base = buildGoogleFontPreviewText(entry);
  const familyText = String(entry?.family || '').trim();

  let merged = mergePreviewGlyphChars(base, FULL_LATIN_ALPHANUM, ui, familyText);
  if (merged.length > MAX_GOOGLE_TEXT_PARAM_LEN) {
    merged = merged.slice(0, MAX_GOOGLE_TEXT_PARAM_LEN);
  }
  return merged;
}

function resolveGooglePreviewRequestText(
  entry: GooglePreviewCatalogEntry | null | undefined,
  uiPreviewText?: string | null,
): string {
  const ui = String(uiPreviewText ?? '').trim();
  if (!ui) {
    return buildGoogleNamePreviewRequestText(entry);
  }
  return buildGooglePreviewRequestText(entry, uiPreviewText);
}

function previewHref(entry: GooglePreviewCatalogEntry, uiPreviewText?: string | null): string {
  const fam = encodeURIComponent(String(entry.family || ''));
  const text = encodeURIComponent(resolveGooglePreviewRequestText(entry, uiPreviewText));
  if (entry.wghtMin != null && entry.wghtMax != null) {
    return `https://fonts.googleapis.com/css2?family=${fam}:wght@${entry.wghtMin}..${entry.wghtMax}&display=swap&text=${text}`;
  }
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@400&display=swap&text=${text}`;
}

function cacheKeyFor(entry: GooglePreviewCatalogEntry | null | undefined, uiPreviewText?: string | null): string {
  return `${String(entry?.family || '')}\0${resolveGooglePreviewRequestText(entry, uiPreviewText)}`;
}

const injected = new Map<string, HTMLLinkElement>();

export type EnsureGoogleFontPreviewCssOptions = {
  previewText?: string | null;
};

export function ensureGoogleFontPreviewCss(
  entry: GooglePreviewCatalogEntry | null | undefined,
  options: EnsureGoogleFontPreviewCssOptions = {},
): void {
  if (!entry?.family || typeof document === 'undefined') return;
  const uiPreviewText = options.previewText;
  const key = cacheKeyFor(entry, uiPreviewText);
  if (injected.has(key)) return;

  const family = String(entry.family);
  for (const [existingKey, link] of injected) {
    if (!existingKey.startsWith(`${family}\0`)) continue;
    try {
      link.remove();
    } catch {
      /* ignore */
    }
    injected.delete(existingKey);
  }

  const href = previewHref(entry, uiPreviewText);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.gfPreview = family;
  link.onerror = () => {
    try {
      link.remove();
    } catch {
      /* ignore */
    }
    injected.delete(key);
  };
  document.head.appendChild(link);
  injected.set(key, link);
}

export function removeAllGoogleFontPreviewCss(): void {
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
