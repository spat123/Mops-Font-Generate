import { normalizeFvarAxisTag } from './fontParser';

/** @typedef {{ id?: string, label: string, weight: number, style: 'normal'|'italic', coordinates?: Record<string, number> }} FontInstanceStyle */

function resolveLocalizedName(nameField) {
  if (!nameField) return '';
  if (typeof nameField === 'string') return nameField.trim();
  if (typeof nameField === 'object') {
    const direct =
      nameField.en ||
      nameField['en-US'] ||
      Object.values(nameField).find((value) => typeof value === 'string' && String(value).trim());
    return String(direct || '').trim();
  }
  return String(nameField).trim();
}

function resolveInstanceStyle(coordinates, label) {
  const coords = coordinates && typeof coordinates === 'object' ? coordinates : {};
  const labelLower = String(label || '').toLowerCase();
  if (Number(coords.ital) >= 1) return 'italic';
  if (Number.isFinite(Number(coords.slnt)) && Number(coords.slnt) < 0) return 'italic';
  if (labelLower.includes('italic') || labelLower.includes('oblique')) return 'italic';
  return 'normal';
}

function resolveInstanceWeight(coordinates) {
  const wght = Number(coordinates?.wght);
  if (Number.isFinite(wght)) return Math.round(wght);
  return 400;
}

function normalizeCoordinates(rawCoords, axes) {
  const coordinates = {};
  for (const axis of axes) {
    const tag = normalizeFvarAxisTag(axis?.tag);
    if (!tag) continue;
    const rawTag = typeof axis?.tag === 'string' ? axis.tag : tag;
    const val = Number(rawCoords?.[rawTag] ?? rawCoords?.[tag]);
    if (Number.isFinite(val)) coordinates[tag] = val;
  }
  return coordinates;
}

/**
 * Named instances из таблицы fvar (локальные VF и любые файлы с instance-именами).
 * @param {import('opentype.js').Font|null|undefined} parsedFontData
 * @returns {FontInstanceStyle[]}
 */
export function extractFvarInstanceStyles(parsedFontData) {
  const fvar = parsedFontData?.tables?.fvar;
  const axes = Array.isArray(fvar?.axes) ? fvar.axes : [];
  const instances = Array.isArray(fvar?.instances) ? fvar.instances : [];
  if (axes.length === 0 || instances.length === 0) return [];

  return instances
    .map((inst, index) => {
      const coordinates = normalizeCoordinates(inst?.coordinates, axes);
      const label = resolveLocalizedName(inst?.name);
      if (!label) return null;
      const style = resolveInstanceStyle(coordinates, label);
      const weight = resolveInstanceWeight(coordinates);
      return {
        id: `fvar-${index}`,
        label,
        weight,
        style,
        coordinates,
      };
    })
    .filter(Boolean);
}

/** Google metadata и локальные fvar instances — единый список для UI. */
export function getFontInstanceStyles(font) {
  if (!font || typeof font !== 'object') return [];
  const fromFont = Array.isArray(font.fontInstanceStyles) ? font.fontInstanceStyles : [];
  if (fromFont.length > 0) return fromFont;
  const fromGoogle = Array.isArray(font.googleFontInstanceStyles) ? font.googleFontInstanceStyles : [];
  return fromGoogle;
}

export function instanceStyleSignature(row) {
  if (row?.coordinates && typeof row.coordinates === 'object' && Object.keys(row.coordinates).length > 0) {
    return Object.keys(row.coordinates)
      .sort()
      .map((tag) => `${tag}:${row.coordinates[tag]}`)
      .join('|');
  }
  const style = row?.style === 'italic' ? 'i' : 'n';
  const weight = Number(row?.weight);
  return `${style}:${Number.isFinite(weight) ? weight : 'na'}`;
}

export function applyFontInstanceStylesToFont(font, instanceStyles) {
  if (!font || typeof font !== 'object') return;
  const list = Array.isArray(instanceStyles) ? instanceStyles.filter(Boolean) : [];
  if (list.length === 0) return;

  font.fontInstanceStyles = list;
  font.googleFontInstanceStyles = list;
  font.availableStyles = list.map((row) => ({
    name: row.label,
    weight: row.weight,
    style: row.style === 'italic' ? 'italic' : 'normal',
    coordinates:
      row.coordinates && typeof row.coordinates === 'object' && Object.keys(row.coordinates).length > 0
        ? { ...row.coordinates }
        : undefined,
  }));
}

export function findFontInstanceStyleByName(font, presetName) {
  const target = String(presetName || '').trim();
  if (!target) return null;
  return getFontInstanceStyles(font).find((row) => String(row?.label || '').trim() === target) || null;
}
