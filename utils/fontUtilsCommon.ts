import type { SessionFontRecord } from '../types/editorFonts';
import { getFontInstanceStyles } from './fontInstanceStyles';

/**
 * Статический файл — одно начертание уже «вшито» в глифы.
 * Дополнительный font-weight / font-style в CSS даёт синтетическое утолщение/наклон.
 */
export function shouldApplyCssWeightStyleForFont(font: SessionFontRecord | null | undefined): boolean {
  // В нашем редакторе для статических семейств (Google/Fontsource и т.п.)
  // разные начертания выбираются браузером по CSS font-weight/font-style.
  // Для VF вес/курсив управляются осями (см. отдельную ветку в useFontCss).
  return Boolean(font) && !Boolean(font?.isVariableFont);
}

export type FontPresetStyle = {
  name: string;
  weight: number;
  style: string;
};

export const PRESET_STYLES: FontPresetStyle[] = [
  { name: 'Thin', weight: 100, style: 'normal' },
  { name: 'ExtraLight', weight: 200, style: 'normal' },
  { name: 'Light', weight: 300, style: 'normal' },
  { name: 'Regular', weight: 400, style: 'normal' },
  { name: 'Medium', weight: 500, style: 'normal' },
  { name: 'SemiBold', weight: 600, style: 'normal' },
  { name: 'Bold', weight: 700, style: 'normal' },
  { name: 'ExtraBold', weight: 800, style: 'normal' },
  { name: 'Black', weight: 900, style: 'normal' },
  { name: 'Thin Italic', weight: 100, style: 'italic' },
  { name: 'ExtraLight Italic', weight: 200, style: 'italic' },
  { name: 'Light Italic', weight: 300, style: 'italic' },
  { name: 'Italic', weight: 400, style: 'italic' },
  { name: 'Medium Italic', weight: 500, style: 'italic' },
  { name: 'SemiBold Italic', weight: 600, style: 'italic' },
  { name: 'Bold Italic', weight: 700, style: 'italic' },
  { name: 'ExtraBold Italic', weight: 800, style: 'italic' },
  { name: 'Black Italic', weight: 900, style: 'italic' },
];

/** Показывать ли в UI переключатель Italic для вариативного шрифта. */
export function variableFontShowsItalicControl(font: SessionFontRecord | null | undefined): boolean {
  if (!font || !font.isVariableFont) return false;
  if (font.italicMode === 'axis-ital' || font.italicMode === 'separate-style') return true;
  return font.hasItalicStyles === true && font.italicMode !== 'axis-slnt';
}

export function variableFontAllowsItalicPresets(
  variableAxes: Record<string, { min?: number; max?: number }> | null | undefined,
  italicMode: string | null | undefined,
): boolean {
  if (italicMode === 'separate-style') return true;
  if (!variableAxes || typeof variableAxes !== 'object') return false;
  const ital = variableAxes.ital;
  if (ital && typeof ital === 'object') {
    const mx = Number(ital.max);
    if (Number.isFinite(mx) && mx > 0) return true;
  }
  const slnt = variableAxes.slnt;
  if (slnt && typeof slnt === 'object') {
    const mn = Number(slnt.min);
    const mx = Number(slnt.max);
    if (Number.isFinite(mn) && Number.isFinite(mx) && mn < mx && (mn < 0 || mx < 0)) return true;
  }
  return false;
}

export const VARIABLE_FONT_DEFAULT_PRESET: FontPresetStyle = {
  name: 'Regular',
  weight: 400,
  style: 'normal',
};

export function variableFontHasWeightAxis(
  variableAxes: Record<string, { min?: number; max?: number }> | null | undefined,
): boolean {
  if (!variableAxes || typeof variableAxes !== 'object') return false;
  const wght = variableAxes.wght;
  const wMin = wght && Number.isFinite(Number(wght.min)) ? Number(wght.min) : null;
  const wMax = wght && Number.isFinite(Number(wght.max)) ? Number(wght.max) : null;
  return wMin != null && wMax != null;
}

export type VariableFontPresetStyle = FontPresetStyle & {
  coordinates?: Record<string, number>;
};

/** Пресеты начертаний для VF: fvar instances или Thin…Black по диапазону wght. */
export function resolveVariableFontAvailableStyles(
  font: SessionFontRecord | null | undefined,
): VariableFontPresetStyle[] {
  if (!font?.isVariableFont) return [];

  const instances = getFontInstanceStyles(font);
  if (instances.length > 0) {
    return instances.map((row) => ({
      name: row.label,
      weight: row.weight,
      style: row.style === 'italic' ? 'italic' : 'normal',
      coordinates: row.coordinates,
    }));
  }

  const axes = font.variableAxes;
  if (axes && typeof axes === 'object' && Object.keys(axes).length > 0) {
    return filterPresetStylesForVariableAxes(axes, undefined, { italicMode: font.italicMode });
  }

  return [];
}

export function filterPresetStylesForVariableAxes(
  variableAxes: Record<string, { min?: number; max?: number; default?: number }> | null | undefined,
  presets: FontPresetStyle[] = PRESET_STYLES,
  options: { italicMode?: string | null } = {},
): FontPresetStyle[] {
  const list = Array.isArray(presets) ? presets : PRESET_STYLES;
  if (!variableAxes || typeof variableAxes !== 'object') {
    return [...list];
  }

  if (!variableFontHasWeightAxis(variableAxes)) {
    return [{ ...VARIABLE_FONT_DEFAULT_PRESET }];
  }

  const wght = variableAxes.wght!;
  const wMin = Number(wght.min);
  const wMax = Number(wght.max);
  const lo = Math.min(wMin, wMax);
  const hi = Math.max(wMin, wMax);

  const allowItalic = variableFontAllowsItalicPresets(variableAxes, options?.italicMode);

  const filtered = list.filter((p) => {
    if (!p || typeof p.weight !== 'number') return false;
    if (p.style === 'italic' && !allowItalic) return false;
    return p.weight >= lo && p.weight <= hi;
  });

  return filtered.length > 0 ? filtered : [{ ...VARIABLE_FONT_DEFAULT_PRESET }];
}

export function clampPresetNameForVariableAxes(
  presetName: string,
  variableAxes: Record<string, { min?: number; max?: number }> | null | undefined,
  hintWeight = 400,
  hintStyle = 'normal',
  options: { italicMode?: string | null } = {},
): string {
  const allowed = filterPresetStylesForVariableAxes(variableAxes, PRESET_STYLES, options);
  if (allowed.some((p) => p.name === presetName)) return presetName;

  const w = Number.isFinite(Number(hintWeight)) ? Number(hintWeight) : 400;
  const style = hintStyle === 'italic' ? 'italic' : 'normal';
  const pool = allowed.filter((p) => p.style === style);
  const list = pool.length ? pool : allowed;
  if (!list.length) return 'Regular';

  let best = list[0];
  for (const p of list) {
    if (Math.abs(p.weight - w) < Math.abs(best.weight - w)) best = p;
  }
  return best.name;
}

export function getFontAvailableStyles(font: SessionFontRecord | null | undefined): FontPresetStyle[] {
  return Array.isArray(font?.availableStyles) && font.availableStyles.length > 0
    ? (font.availableStyles as FontPresetStyle[])
    : PRESET_STYLES;
}

/** Имя пресета по умолчанию для статического шрифта (Regular или ближайший к 400). */
export function resolveDefaultStaticPresetName(font: SessionFontRecord | null | undefined): string {
  const available = getFontAvailableStyles(font);
  const regular = available.find((style) => style?.name === 'Regular');
  if (regular?.name) return regular.name;

  const normalStyles = available.filter((style) => style?.style === 'normal');
  const pool = normalStyles.length > 0 ? normalStyles : available;
  if (pool.length === 0) return 'Regular';

  const best = pool.reduce<FontPresetStyle | null>((closest, style) => {
    if (!closest) return style;
    return Math.abs(Number(style?.weight ?? 400) - 400) < Math.abs(Number(closest?.weight ?? 400) - 400)
      ? style
      : closest;
  }, null);

  return best?.name || available[0]?.name || 'Regular';
}

export function isPresetAvailableForFont(
  font: SessionFontRecord | null | undefined,
  presetName: string | null | undefined,
): boolean {
  const name = String(presetName || '').trim();
  if (!name || !font) return false;
  return getFontAvailableStyles(font).some((s) => String(s?.name || '').trim() === name);
}

/** Имя пресета для apply после restore plan (VF — как есть; static — с проверкой availableStyles). */
export function resolveRestorablePresetName(
  font: SessionFontRecord,
  candidate: string | null | undefined,
): string {
  const trimmed = typeof candidate === 'string' ? candidate.trim() : '';
  if (font.isVariableFont) {
    return trimmed || 'Regular';
  }
  if (trimmed && isPresetAvailableForFont(font, trimmed)) {
    return trimmed;
  }
  return resolveDefaultStaticPresetName(font);
}

export const findStyleInfoByWeightAndStyle = (
  weight: number | null | undefined,
  style: string | null | undefined,
): FontPresetStyle => {
  let w = weight || 400;
  let s = style || 'normal';

  switch (true) {
    case w <= 100 && s === 'normal':
      return { name: 'Thin', weight: 100, style: 'normal' };
    case w <= 100 && s === 'italic':
      return { name: 'Thin Italic', weight: 100, style: 'italic' };
    case w <= 200 && s === 'normal':
      return { name: 'ExtraLight', weight: 200, style: 'normal' };
    case w <= 200 && s === 'italic':
      return { name: 'ExtraLight Italic', weight: 200, style: 'italic' };
    case w <= 300 && s === 'normal':
      return { name: 'Light', weight: 300, style: 'normal' };
    case w <= 300 && s === 'italic':
      return { name: 'Light Italic', weight: 300, style: 'italic' };
    case w <= 400 && s === 'normal':
      return { name: 'Regular', weight: 400, style: 'normal' };
    case w <= 400 && s === 'italic':
      return { name: 'Italic', weight: 400, style: 'italic' };
    case w <= 500 && s === 'normal':
      return { name: 'Medium', weight: 500, style: 'normal' };
    case w <= 500 && s === 'italic':
      return { name: 'Medium Italic', weight: 500, style: 'italic' };
    case w <= 600 && s === 'normal':
      return { name: 'SemiBold', weight: 600, style: 'normal' };
    case w <= 600 && s === 'italic':
      return { name: 'SemiBold Italic', weight: 600, style: 'italic' };
    case w <= 700 && s === 'normal':
      return { name: 'Bold', weight: 700, style: 'normal' };
    case w <= 700 && s === 'italic':
      return { name: 'Bold Italic', weight: 700, style: 'italic' };
    case w <= 800 && s === 'normal':
      return { name: 'ExtraBold', weight: 800, style: 'normal' };
    case w <= 800 && s === 'italic':
      return { name: 'ExtraBold Italic', weight: 800, style: 'italic' };
    case w <= 900 && s === 'normal':
      return { name: 'Black', weight: 900, style: 'normal' };
    case w <= 900 && s === 'italic':
      return { name: 'Black Italic', weight: 900, style: 'italic' };
    default:
      return { name: 'Regular', weight: 400, style: 'normal' };
  }
};

export const getFormatFromExtension = (fileName: unknown): string => {
  const extension = String(fileName || '')
    .toLowerCase()
    .split('.')
    .pop();
  switch (extension) {
    case 'ttf':
      return 'truetype';
    case 'otf':
      return 'opentype';
    case 'woff':
      return 'woff';
    case 'woff2':
      return 'woff2';
    default:
      return extension ? 'truetype' : '';
  }
};

export function sessionFontCardPreviewStyle(font: SessionFontRecord): { fontFamily: string; fontSize: string } {
  const quoted = font.fontFamily
    ? `'${font.fontFamily}'`
    : `'${font.displayName || font.name}'`;
  return { fontFamily: quoted, fontSize: '20px' };
}
