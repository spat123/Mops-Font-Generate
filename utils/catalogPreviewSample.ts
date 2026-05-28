import { ENTIRE_PRINTABLE_ASCII_SAMPLE } from './previewSampleStrings';

export const CATALOG_PREVIEW_PRESET_NAME = 'name';
export const CATALOG_PREVIEW_PRESET_PANGRAM = 'pangram';
export const CATALOG_PREVIEW_PRESET_GLYPHS = 'glyphs';
export const CATALOG_PREVIEW_PRESET_CUSTOM = 'custom';

export const CATALOG_PREVIEW_PANGRAM_EN = 'Pack my box with five dozen liquor jugs.';
export const CATALOG_PREVIEW_PANGRAM_RU =
  'Съешь же ещё этих мягких французских булок, да выпей чаю.';

export const CATALOG_PREVIEW_FONT_SIZE_DEFAULT_PX = 32;
export const CATALOG_PREVIEW_FONT_SIZE_MIN_PX = 16;
export const CATALOG_PREVIEW_FONT_SIZE_MAX_PX = 64;
export const CATALOG_PREVIEW_FONT_SIZE_STEP_PX = 1;

export function clampCatalogPreviewFontSizePx(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return CATALOG_PREVIEW_FONT_SIZE_DEFAULT_PX;
  return Math.min(
    CATALOG_PREVIEW_FONT_SIZE_MAX_PX,
    Math.max(CATALOG_PREVIEW_FONT_SIZE_MIN_PX, Math.round(n)),
  );
}

/** Минимальная высота плитки: padding, заголовок, футер + превью по размеру шрифта. */
export function resolveCatalogGridCardMinHeightPx({
  fontSizePx = CATALOG_PREVIEW_FONT_SIZE_DEFAULT_PX,
  multiline = false,
}: {
  fontSizePx?: number;
  multiline?: boolean;
} = {}): number {
  const fontSize = clampCatalogPreviewFontSizePx(fontSizePx);
  const lineHeight = 1.25;
  const fixedOverheadPx = 128;
  const multilineMarginPx = multiline ? 16 : 0;
  const previewLines = multiline ? 2 : 1;

  return Math.round(fixedOverheadPx + fontSize * lineHeight * previewLines + multilineMarginPx);
}

export const CATALOG_PREVIEW_PRESET_SELECT_OPTIONS = [
  { value: CATALOG_PREVIEW_PRESET_NAME, label: 'Имя' },
  { value: CATALOG_PREVIEW_PRESET_PANGRAM, label: 'Панграмма' },
  { value: CATALOG_PREVIEW_PRESET_GLYPHS, label: 'Набор символов' },
] as const;

export function isRussianUiLocale(): boolean {
  if (typeof navigator === 'undefined') return true;
  const langs =
    Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language];
  return langs.some((lang) => String(lang || '').toLowerCase().startsWith('ru'));
}

export function resolveCatalogPangramText(): string {
  return isRussianUiLocale() ? CATALOG_PREVIEW_PANGRAM_RU : CATALOG_PREVIEW_PANGRAM_EN;
}

export function resolveCatalogGlobalPreviewText(preset: string, customText: unknown): string | null {
  const typed = String(customText ?? '').trim();
  if (typed) return typed;

  const mode = String(preset || CATALOG_PREVIEW_PRESET_NAME);
  if (mode === CATALOG_PREVIEW_PRESET_NAME || mode === CATALOG_PREVIEW_PRESET_CUSTOM) return null;
  if (mode === CATALOG_PREVIEW_PRESET_PANGRAM) return resolveCatalogPangramText();
  if (mode === CATALOG_PREVIEW_PRESET_GLYPHS) return ENTIRE_PRINTABLE_ASCII_SAMPLE;
  return null;
}

export function resolveCatalogCardPreviewText({
  family,
  preset,
  customText,
}: {
  family?: string;
  preset?: string;
  customText?: unknown;
}): string {
  const global = resolveCatalogGlobalPreviewText(preset || CATALOG_PREVIEW_PRESET_NAME, customText);
  if (global != null) return global;
  return String(family || '').trim() || 'Font';
}

export function isCatalogCustomPreviewTextActive(customText: unknown): boolean {
  return Boolean(String(customText ?? '').trim());
}

export function isCatalogGridPreviewMultiline({
  preset,
  customText,
}: { preset?: string; customText?: unknown } = {}): boolean {
  if (isCatalogCustomPreviewTextActive(customText)) return true;
  const mode = String(preset || CATALOG_PREVIEW_PRESET_NAME);
  return mode === CATALOG_PREVIEW_PRESET_PANGRAM || mode === CATALOG_PREVIEW_PRESET_GLYPHS;
}

const CYRILLIC_CHAR_RE = /[\u0400-\u04FF]/;
const LATIN_LETTER_IN_NAME_RE = /[A-Za-z\u00C0-\u024F]/;

/**
 * Сабсеты Fontsource для превью на карточке (режим «Имя»): не грузим latin+cyrillic всегда.
 */
export function pickFontsourcePreviewSubsetsForCardText(text: string): string[] {
  const sample = String(text || '');
  const hasCyrillic = CYRILLIC_CHAR_RE.test(sample);
  const hasLatin = LATIN_LETTER_IN_NAME_RE.test(sample);
  if (hasCyrillic && hasLatin) return ['latin', 'cyrillic'];
  if (hasCyrillic) return ['cyrillic'];
  return ['latin'];
}
