import { findStyleInfoByWeightAndStyle, variableFontAllowsItalicPresets } from './fontUtilsCommon';
import { getFontInstanceStyles, instanceStyleSignature, type FontInstanceStyle } from './fontInstanceStyles';
import type { SessionFontRecord } from '../types/editorFonts';

export type WeightVariationRow = { name: string; wght: number };
export type ItalicVariationRow = WeightVariationRow & { slnt: number; ital: number };
export type StylesPreviewRow = { name: string; wght?: number; ital?: number; slnt?: number; [axis: string]: unknown };

export const WEIGHT_VARIATIONS: WeightVariationRow[] = [
  { name: 'Thin', wght: 100 },
  { name: 'ExtraLight', wght: 200 },
  { name: 'Light', wght: 300 },
  { name: 'Regular', wght: 400 },
  { name: 'Medium', wght: 500 },
  { name: 'SemiBold', wght: 600 },
  { name: 'Bold', wght: 700 },
  { name: 'ExtraBold', wght: 800 },
  { name: 'Black', wght: 900 },
];

export const ITALIC_VARIATIONS: ItalicVariationRow[] = [
  { name: 'Thin Italic', wght: 100, slnt: -10, ital: 1 },
  { name: 'Light Italic', wght: 300, slnt: -10, ital: 1 },
  { name: 'Italic', wght: 400, slnt: -10, ital: 1 },
  { name: 'Medium Italic', wght: 500, slnt: -10, ital: 1 },
  { name: 'Bold Italic', wght: 700, slnt: -10, ital: 1 },
  { name: 'Black Italic', wght: 900, slnt: -10, ital: 1 },
];

export const AXIS_RATIOS = [0, 0.25, 0.5, 0.75, 1] as const;

function getWghtAxisRange(variableAxes: SessionFontRecord['variableAxes']) {
  const wght = variableAxes?.wght;
  if (!wght || typeof wght !== 'object') return null;
  const lo = Math.min(Number(wght.min), Number(wght.max));
  const hi = Math.max(Number(wght.min), Number(wght.max));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return { lo, hi };
}

/** Строки превью «Вес» по диапазону оси wght (без выдуманных весов вне min–max). */
export function getWeightVariationsForAxes(
  variableAxes: SessionFontRecord['variableAxes'],
): WeightVariationRow[] {
  const range = getWghtAxisRange(variableAxes);
  if (!range) return [];
  return WEIGHT_VARIATIONS.filter((v) => v.wght >= range.lo && v.wght <= range.hi);
}

/** Курсивные превью — только если есть ось ital/slnt и вес в диапазоне. */
export function getItalicVariationsForAxes(
  variableAxes: SessionFontRecord['variableAxes'],
  italicMode: string | undefined,
): ItalicVariationRow[] {
  const range = getWghtAxisRange(variableAxes);
  if (!range || !variableFontAllowsItalicPresets(variableAxes, italicMode)) return [];
  return ITALIC_VARIATIONS.filter((v) => v.wght >= range.lo && v.wght <= range.hi);
}

function buildPreviewRowFromInstance(
  row: FontInstanceStyle | null | undefined,
  fallbackStyle: 'normal' | 'italic' = 'normal',
): StylesPreviewRow {
  const coords =
    row?.coordinates && typeof row.coordinates === 'object' && Object.keys(row.coordinates).length > 0
      ? { ...row.coordinates }
      : {};
  const wght = Number(coords.wght ?? row?.weight);
  if (Number.isFinite(wght)) coords.wght = wght;

  const style = row?.style === 'italic' ? 'italic' : fallbackStyle;
  const info = Number.isFinite(wght) ? findStyleInfoByWeightAndStyle(wght, style) : null;
  const name = String(row?.label || info?.name || wght || 'Preset').trim() || info?.name || 'Regular';

  return { name, ...coords };
}

function mapInstanceStylesToWeightRows(instanceStyles: FontInstanceStyle[]): StylesPreviewRow[] {
  const seen = new Set<string>();
  const out: StylesPreviewRow[] = [];
  for (const row of instanceStyles) {
    if (!row || row.style === 'italic') continue;
    const sig = instanceStyleSignature(row);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(buildPreviewRowFromInstance(row, 'normal'));
  }
  out.sort((a, b) => Number(a.wght ?? 0) - Number(b.wght ?? 0));
  return out;
}

function mapInstanceStylesToItalicRows(
  instanceStyles: FontInstanceStyle[],
  variableAxes: SessionFontRecord['variableAxes'],
  italicMode: string | undefined,
): StylesPreviewRow[] {
  if (!variableFontAllowsItalicPresets(variableAxes, italicMode)) return [];
  const seen = new Set<string>();
  const out: StylesPreviewRow[] = [];
  for (const row of instanceStyles) {
    if (!row || row.style !== 'italic') continue;
    const sig = instanceStyleSignature(row);
    if (seen.has(sig)) continue;
    seen.add(sig);

    const previewRow = buildPreviewRowFromInstance(row, 'italic');
    const wght = Number(previewRow.wght);
    const hasCustomCoords =
      row?.coordinates &&
      typeof row.coordinates === 'object' &&
      Object.keys(row.coordinates).some((tag) => tag !== 'wght');
    if (!hasCustomCoords && Number.isFinite(wght)) {
      const hit = ITALIC_VARIATIONS.find((v) => v.wght === wght);
      if (hit) {
        out.push({ ...hit, name: previewRow.name });
        continue;
      }
    }

    if (previewRow.ital == null && variableAxes?.ital) previewRow.ital = 1;
    if (previewRow.slnt == null && variableAxes?.slnt && previewRow.ital) {
      previewRow.slnt = Number(variableAxes.slnt.min ?? -10);
    }
    out.push(previewRow);
  }
  out.sort((a, b) => Number(a.wght ?? 0) - Number(b.wght ?? 0));
  return out;
}

/** Реальные начертания из metadata (Google downloadStyles и т.п.) или срез по оси wght. */
export function getStylesModeWeightRows(selectedFont: SessionFontRecord | null | undefined): StylesPreviewRow[] {
  const axes = selectedFont?.variableAxes;
  if (!axes?.wght) return [];
  const instances = getFontInstanceStyles(selectedFont);
  if (Array.isArray(instances) && instances.length > 0) {
    const rows = mapInstanceStylesToWeightRows(instances);
    if (rows.length > 0) return rows;
  }
  return getWeightVariationsForAxes(axes);
}

export function getStylesModeItalicRows(
  selectedFont: SessionFontRecord | null | undefined,
): StylesPreviewRow[] {
  const axes = selectedFont?.variableAxes;
  if (!axes) return [];
  const italicMode = selectedFont.italicMode;
  const instances = getFontInstanceStyles(selectedFont);
  if (Array.isArray(instances) && instances.length > 0) {
    const rows = mapInstanceStylesToItalicRows(instances, axes, italicMode);
    if (rows.length > 0) return rows;
  }
  return getItalicVariationsForAxes(axes, italicMode);
}

/** Пресеты VF без оси wght (или когда wght не используется для списка). */
export function getStylesModeNamedPresetRows(
  selectedFont: SessionFontRecord | null | undefined,
): StylesPreviewRow[] {
  const axes = selectedFont?.variableAxes;
  if (axes?.wght) return [];
  const instances = getFontInstanceStyles(selectedFont);
  if (!Array.isArray(instances) || instances.length === 0) return [];

  const seen = new Set<string>();
  const out: StylesPreviewRow[] = [];
  for (const row of instances) {
    const sig = instanceStyleSignature(row);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(buildPreviewRowFromInstance(row, row?.style === 'italic' ? 'italic' : 'normal'));
  }
  return out;
}

export type StylesPreviewStats = {
  n: number;
  kind: 'none' | 'static' | 'variable';
};

export function getStylesPreviewStats(
  selectedFont: SessionFontRecord | null | undefined,
): StylesPreviewStats {
  if (!selectedFont) return { n: 0, kind: 'none' };

  const available = selectedFont.availableStyles;
  const hasStaticStyles = Array.isArray(available) && available.length > 1;
  const hasVariableAxes =
    selectedFont.isVariableFont &&
    selectedFont.variableAxes &&
    Object.keys(selectedFont.variableAxes).length > 0;
  const showStaticStyles = hasStaticStyles && (!selectedFont.isVariableFont || !hasVariableAxes);

  if (showStaticStyles && available) {
    return { n: available.length, kind: 'static' };
  }

  if (hasVariableAxes && selectedFont.variableAxes) {
    const axes = selectedFont.variableAxes;
    let n = 0;

    if (axes.wght !== undefined) n += getStylesModeWeightRows(selectedFont).length;
    if (axes.ital !== undefined || axes.slnt !== undefined) {
      n += getStylesModeItalicRows(selectedFont).length;
    }
    n += getStylesModeNamedPresetRows(selectedFont).length;

    const otherKeys = Object.keys(axes).filter((axis) => !['wght', 'ital', 'slnt'].includes(axis));
    n += otherKeys.length * AXIS_RATIOS.length;

    return { n, kind: 'variable' };
  }

  return { n: 0, kind: 'none' };
}
