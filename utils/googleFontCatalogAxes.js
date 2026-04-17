import { normalizeFvarAxisTag } from './fontParser';

/** Подписи осей из каталога Google (metadata); для неизвестных — тег. */
const TAG_LABELS = {
  wght: 'Weight',
  wdth: 'Width',
  opsz: 'Optical size',
  slnt: 'Slant',
  ital: 'Italic',
  GRAD: 'Grade',
  XOPQ: 'Thin stroke',
  YOPQ: 'Thick stroke',
  XTRA: 'Counter width',
  YTAS: 'Ascender height',
  YTDE: 'Descender depth',
  YTFI: 'Figure height',
  YTLC: 'Lowercase height',
  YTUC: 'Uppercase height',
};

/**
 * Оси из ответа /api/google-fonts-catalog → формат variableAxes в приложении.
 * @param {Array<{ tag?: string, min?: number, max?: number, default?: number, defaultValue?: number }>} rows
 * @returns {Record<string, { name: string, min: number, max: number, default: number }>|null}
 */
/** Строка variation для fontObj (как в processLocalFont). */
export function buildVariationSettingsCssString(variableAxes) {
  if (!variableAxes || typeof variableAxes !== 'object') return '';
  return Object.entries(variableAxes)
    .map(([tag, v]) => {
      const d = v?.default;
      const num = typeof d === 'number' && Number.isFinite(d) ? d : 0;
      return `\"${tag}\" ${num}`;
    })
    .join(', ');
}

export function catalogAxesToVariableAxes(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const acc = {};
  for (const row of rows) {
    const tag = normalizeFvarAxisTag(row?.tag);
    if (!tag) continue;
    if (typeof row.min !== 'number' || typeof row.max !== 'number' || !Number.isFinite(row.min) || !Number.isFinite(row.max)) {
      continue;
    }
    const min = row.min;
    const max = row.max;
    const defRaw = row.defaultValue ?? row.default;
    const def =
      typeof defRaw === 'number' && Number.isFinite(defRaw) ? defRaw : min;
    acc[tag] = {
      name: TAG_LABELS[tag] || tag,
      min,
      max,
      default: def,
    };
  }
  return Object.keys(acc).length ? acc : null;
}
