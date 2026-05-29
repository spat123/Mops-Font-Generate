export type OpenTypeFeatureOverrides = Record<string, 0 | 1>;

/**
 * Минимальный набор фич, которые обычно активны “по умолчанию” в shaping/браузере.
 * Это не “настройка шрифта”, а ожидаемое поведение движка при `font-feature-settings: normal`.
 */
export const DEFAULT_ENABLED_OPEN_TYPE_FEATURES = new Set<string>([
  'ccmp',
  'calt',
  'clig',
  'kern',
  'liga',
  'locl',
  'mark',
  'mkmk',
  'rlig',
]);

export function resolveOpenTypeFeatureEnabled(
  tag: string,
  overrides: OpenTypeFeatureOverrides | null | undefined,
  defaultEnabled = DEFAULT_ENABLED_OPEN_TYPE_FEATURES,
): boolean {
  const k = String(tag || '').trim().toLowerCase().slice(0, 4);
  if (!k) return false;
  const v = overrides && Object.prototype.hasOwnProperty.call(overrides, k) ? overrides[k] : undefined;
  if (v === 0) return false;
  if (v === 1) return true;
  return defaultEnabled.has(k);
}

export function buildFontFeatureSettingsCss(overrides: OpenTypeFeatureOverrides | null | undefined): string {
  if (!overrides) return 'normal';
  const entries = Object.entries(overrides)
    .map(([tag, val]) => [String(tag || '').trim().toLowerCase().slice(0, 4), val] as const)
    .filter(([tag, val]) => tag && (val === 0 || val === 1))
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) return 'normal';
  return entries.map(([tag, val]) => `"${tag}" ${val}`).join(', ');
}

export function toggleOpenTypeFeatureOverride(
  tag: string,
  overrides: OpenTypeFeatureOverrides,
  defaultEnabled = DEFAULT_ENABLED_OPEN_TYPE_FEATURES,
): OpenTypeFeatureOverrides {
  const k = String(tag || '').trim().toLowerCase().slice(0, 4);
  if (!k) return overrides;
  const next = { ...(overrides || {}) } as OpenTypeFeatureOverrides;
  if (Object.prototype.hasOwnProperty.call(next, k)) {
    delete next[k];
    return next;
  }
  next[k] = defaultEnabled.has(k) ? 0 : 1;
  return next;
}

