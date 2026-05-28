const AXIS_PRIORITY = ['wght', 'ital', 'slnt'];

type AxisSettings = Record<string, number | string | null | undefined>;
type VariableAxesMap = Record<string, { default?: number; min?: number; max?: number }>;

function getOrderedAxisEntries(
  settings: AxisSettings | null | undefined,
  supportedAxes: Record<string, unknown> | null = null,
): Array<[string, number | string]> {
  if (!settings || typeof settings !== 'object') return [];

  const entries = Object.entries(settings).filter(([tag, value]) => {
    if (value == null || value === '') return false;
    if (!supportedAxes) return true;
    return supportedAxes[tag] !== undefined;
  }) as Array<[string, number | string]>;

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

export type FormatFontVariationSettingsOptions = {
  fallback?: string;
  supportedAxes?: Record<string, unknown> | null;
  valueFormatter?: (tag: string, value: number | string) => string | number;
};

export function formatFontVariationSettings(
  settings: AxisSettings | null | undefined,
  options: FormatFontVariationSettingsOptions = {},
): string {
  const { fallback = 'normal', supportedAxes = null, valueFormatter = null } = options;

  const entries = getOrderedAxisEntries(settings, supportedAxes);
  if (entries.length === 0) return fallback;

  return entries
    .map(
      ([tag, value]) =>
        `"${tag}" ${typeof valueFormatter === 'function' ? valueFormatter(tag, value) : value}`,
    )
    .join(', ');
}

/** Строка variation для fontObj (как в processLocalFont). */
export function buildVariationSettingsCssString(variableAxes: VariableAxesMap | null | undefined): string {
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

export function generateVariationSettings(
  styleObj: AxisSettings | Record<string, unknown> | null | undefined,
  supportedAxes: Record<string, unknown> | null | undefined,
): string {
  return formatFontVariationSettings(styleObj as AxisSettings, {
    fallback: '',
    supportedAxes,
  });
}

export type FontVariationEntry = { tag: string; value: number };

/** Разбор строки `font-variation-settings` в массив осей. */
export function parseFontVariationSettingsString(input: unknown): FontVariationEntry[] {
  const s = String(input ?? '').trim();
  if (!s || s === 'normal') return [];
  const out: FontVariationEntry[] = [];
  const re = /"([^"]+)"\s*([-+]?\d*\.?\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const tag = String(m[1] ?? '').trim();
    const v = Number(m[2]);
    if (!tag || !Number.isFinite(v)) continue;
    out.push({ tag, value: v });
  }
  return out;
}

export function upsertFontVariationEntry(
  entries: FontVariationEntry[],
  tag: string,
  value: number,
): FontVariationEntry[] {
  const t = String(tag);
  const v = Number(value);
  if (!t || !Number.isFinite(v)) return entries;
  const idx = entries.findIndex((e) => e.tag === t);
  if (idx >= 0) {
    const next = entries.slice();
    next[idx] = { tag: t, value: v };
    return next;
  }
  return [...entries, { tag: t, value: v }];
}

/** Сборка строки FVS из массива (Waterfall и др.). */
export function stringifyFontVariationEntries(entries: FontVariationEntry[] | null | undefined): string {
  if (!Array.isArray(entries) || entries.length === 0) return 'normal';
  return entries.map((e) => `"${e.tag}" ${e.value}`).join(', ');
}
