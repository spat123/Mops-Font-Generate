// Общие вспомогательные функции для работы со шрифтами

// Константы пресетов стилей
export const PRESET_STYLES = [
  { name: 'Thin', weight: 100, style: 'normal' },
  { name: 'ExtraLight', weight: 200, style: 'normal' },
  { name: 'Light', weight: 300, style: 'normal' },
  { name: 'Regular', weight: 400, style: 'normal' },
  { name: 'Medium', weight: 500, style: 'normal' },
  { name: 'SemiBold', weight: 600, style: 'normal' },
  { name: 'Bold', weight: 700, style: 'normal' },
  { name: 'ExtraBold', weight: 800, style: 'normal' },
  { name: 'Black', weight: 900, style: 'normal' },
  // { name: 'ExtraBlack', weight: 1000, style: 'normal' }, // Редко используется
  { name: 'Thin Italic', weight: 100, style: 'italic' },
  { name: 'ExtraLight Italic', weight: 200, style: 'italic' },
  { name: 'Light Italic', weight: 300, style: 'italic' },
  { name: 'Italic', weight: 400, style: 'italic' },
  { name: 'Medium Italic', weight: 500, style: 'italic' },
  { name: 'SemiBold Italic', weight: 600, style: 'italic' },
  { name: 'Bold Italic', weight: 700, style: 'italic' },
  { name: 'ExtraBold Italic', weight: 800, style: 'italic' },
  { name: 'Black Italic', weight: 900, style: 'italic' },
  // { name: 'ExtraBlack Italic', weight: 1000, style: 'italic' }
];

/**
 * Есть ли у VF смысл показывать курсивные пресеты (ось ital или реальный slnt).
 * @param {Record<string, { min?: number, max?: number }>|null|undefined} variableAxes
 * @param {'none'|'axis-ital'|'axis-slnt'|'separate-style'|string|null|undefined} italicMode
 */
/** Показывать ли в UI переключатель Italic для вариативного шрифта (Variable Axes). */
export function variableFontShowsItalicControl(font) {
  if (!font || !font.isVariableFont) return false;
  if (font.italicMode === 'axis-ital' || font.italicMode === 'separate-style') return true;
  return font.hasItalicStyles === true && font.italicMode !== 'axis-slnt';
}

export function variableFontAllowsItalicPresets(variableAxes, italicMode) {
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

/**
 * Оставляет только пресеты, совместимые с осями вариативного шрифта (в первую очередь wght).
 * @param {Record<string, { min?: number, max?: number, default?: number }>|null|undefined} variableAxes
 * @param {typeof PRESET_STYLES} [presets]
 * @param {{ italicMode?: 'none'|'axis-ital'|'axis-slnt'|'separate-style'|string|null }} [options]
 */
export function filterPresetStylesForVariableAxes(variableAxes, presets = PRESET_STYLES, options = {}) {
  const list = Array.isArray(presets) ? presets : PRESET_STYLES;
  if (!variableAxes || typeof variableAxes !== 'object') {
    return [...list];
  }

  const wght = variableAxes.wght;
  const wMin = wght && Number.isFinite(Number(wght.min)) ? Number(wght.min) : null;
  const wMax = wght && Number.isFinite(Number(wght.max)) ? Number(wght.max) : null;
  const hasWght = wMin != null && wMax != null;
  const lo = hasWght ? Math.min(wMin, wMax) : null;
  const hi = hasWght ? Math.max(wMin, wMax) : null;

  const allowItalic = variableFontAllowsItalicPresets(variableAxes, options?.italicMode);

  const filtered = list.filter((p) => {
    if (!p || typeof p.weight !== 'number') return false;
    if (p.style === 'italic' && !allowItalic) return false;
    if (!hasWght) return true;
    return p.weight >= lo && p.weight <= hi;
  });

  return filtered.length > 0 ? filtered : [...list];
}

/**
 * Если имя пресета не входит в допустимые для VF, подбирает ближайший по весу и стилю.
 */
export function clampPresetNameForVariableAxes(
  presetName,
  variableAxes,
  hintWeight = 400,
  hintStyle = 'normal',
  options = {},
) {
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

/**
 * Находит информацию о стиле по весу и типу шрифта
 * @param {number} weight - Вес шрифта (100-900)
 * @param {string} style - Стиль шрифта ('normal', 'italic')
 * @returns {Object} - Объект с информацией о стиле (имя, вес, стиль)
 */
export const findStyleInfoByWeightAndStyle = (weight, style) => {
  // Нормализуем вес для поиска
  if (!weight) weight = 400;
  if (!style) style = 'normal';

  // Ищем соответствие стилю и весу
  switch (true) {
    case weight <= 100 && style === 'normal':
      return { name: 'Thin', weight: 100, style: 'normal' };
    case weight <= 100 && style === 'italic':
      return { name: 'Thin Italic', weight: 100, style: 'italic' };
    case weight <= 200 && style === 'normal':
      return { name: 'ExtraLight', weight: 200, style: 'normal' };
    case weight <= 200 && style === 'italic':
      return { name: 'ExtraLight Italic', weight: 200, style: 'italic' };
    case weight <= 300 && style === 'normal':
      return { name: 'Light', weight: 300, style: 'normal' };
    case weight <= 300 && style === 'italic':
      return { name: 'Light Italic', weight: 300, style: 'italic' };
    case weight <= 400 && style === 'normal':
      return { name: 'Regular', weight: 400, style: 'normal' };
    case weight <= 400 && style === 'italic':
      return { name: 'Italic', weight: 400, style: 'italic' };
    case weight <= 500 && style === 'normal':
      return { name: 'Medium', weight: 500, style: 'normal' };
    case weight <= 500 && style === 'italic':
      return { name: 'Medium Italic', weight: 500, style: 'italic' };
    case weight <= 600 && style === 'normal':
      return { name: 'SemiBold', weight: 600, style: 'normal' };
    case weight <= 600 && style === 'italic':
      return { name: 'SemiBold Italic', weight: 600, style: 'italic' };
    case weight <= 700 && style === 'normal':
      return { name: 'Bold', weight: 700, style: 'normal' };
    case weight <= 700 && style === 'italic':
      return { name: 'Bold Italic', weight: 700, style: 'italic' };
    case weight <= 800 && style === 'normal':
      return { name: 'ExtraBold', weight: 800, style: 'normal' };
    case weight <= 800 && style === 'italic':
      return { name: 'ExtraBold Italic', weight: 800, style: 'italic' };
    case weight <= 900 && style === 'normal':
      return { name: 'Black', weight: 900, style: 'normal' };
    case weight <= 900 && style === 'italic':
      return { name: 'Black Italic', weight: 900, style: 'italic' };
    default:
      return { name: 'Regular', weight: 400, style: 'normal' };
  }
};

/**
 * Определяет формат шрифта на основе расширения файла
 * @param {string} fileName - Имя файла шрифта
 * @returns {string} - Формат шрифта для @font-face
 */
export const getFormatFromExtension = (fileName) => {
  const extension = fileName?.toLowerCase().split('.').pop() || '';
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
      // Попытка вернуть truetype по умолчанию, если расширение неизвестно, но есть
      return extension ? 'truetype' : '';
  }
};

/** Стили строки превью для SessionFontCard (локальные и Fontsource в сессии). */
export function sessionFontCardPreviewStyle(font) {
  const quoted = font.fontFamily
    ? `'${font.fontFamily}'`
    : `'${font.displayName || font.name}'`;
  return { fontFamily: quoted, fontSize: '20px' };
}
