const AXIS_PRIORITY = ['wght', 'ital', 'slnt'];

function getOrderedAxisEntries(settings, supportedAxes = null) {
  if (!settings || typeof settings !== 'object') return [];

  const entries = Object.entries(settings).filter(([tag, value]) => {
    if (value == null || value === '') return false;
    if (!supportedAxes) return true;
    return supportedAxes[tag] !== undefined;
  });

  if (entries.length === 0) return [];

  return entries.sort(([leftTag], [rightTag]) => {
    const leftIndex = AXIS_PRIORITY.indexOf(leftTag);
    const rightIndex = AXIS_PRIORITY.indexOf(rightTag);
    const leftRank = leftIndex === -1 ? AXIS_PRIORITY.length : leftIndex;
    const rightRank = rightIndex === -1 ? AXIS_PRIORITY.length : rightIndex;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return leftTag.localeCompare(rightTag);
  });
}

export function formatFontVariationSettings(settings, options = {}) {
  const {
    fallback = 'normal',
    supportedAxes = null,
    valueFormatter = null,
  } = options;

  const entries = getOrderedAxisEntries(settings, supportedAxes);
  if (entries.length === 0) return fallback;

  return entries
    .map(([tag, value]) => `"${tag}" ${typeof valueFormatter === 'function' ? valueFormatter(tag, value) : value}`)
    .join(', ');
}

/** Строка variation для fontObj (как в processLocalFont). */
export function buildVariationSettingsCssString(variableAxes) {
  if (!variableAxes || typeof variableAxes !== 'object') return '';

  const axisDefaults = Object.fromEntries(
    Object.entries(variableAxes).map(([tag, axisData]) => {
      const rawValue = axisData?.default;
      const value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : 0;
      return [tag, value];
    }),
  );

  return formatFontVariationSettings(axisDefaults, { fallback: '' });
}

export function generateVariationSettings(styleObj, supportedAxes) {
  return formatFontVariationSettings(styleObj, {
    fallback: '',
    supportedAxes,
  });
}
