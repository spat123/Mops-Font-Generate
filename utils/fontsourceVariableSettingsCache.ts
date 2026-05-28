const FONTSOURCE_VARIABLE_SETTINGS_CACHE_KEY = 'dinamic-fontsource-variable-settings-v1';
const FONTSOURCE_VARIABLE_SETTINGS_CACHE_LIMIT = 120;

type VariableAxesMap = Record<string, { min?: number; max?: number; default?: number }>;

type CacheEntry = {
  settings: Record<string, number>;
  updatedAt: number;
};

function normalizeSlug(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeReadCache(): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FONTSOURCE_VARIABLE_SETTINGS_CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function safeWriteCache(payload: Record<string, CacheEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FONTSOURCE_VARIABLE_SETTINGS_CACHE_KEY, JSON.stringify(payload || {}));
  } catch {
    // no-op
  }
}

function sanitizeSettingsByAxes(
  settings: Record<string, unknown> | null | undefined,
  variableAxes: VariableAxesMap | null | undefined,
): Record<string, number> | null {
  if (!settings || typeof settings !== 'object') return null;
  if (!variableAxes || typeof variableAxes !== 'object') return null;

  const allowedTags = Object.keys(variableAxes);
  if (allowedTags.length === 0) return null;

  const normalized: Record<string, number> = {};
  allowedTags.forEach((tag) => {
    const axis = variableAxes[tag];
    if (!axis || typeof axis !== 'object') return;
    const raw = toFiniteNumber(settings[tag]);
    if (!Number.isFinite(raw)) return;

    const min = toFiniteNumber(axis.min);
    const max = toFiniteNumber(axis.max);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      const lo = Math.min(min!, max!);
      const hi = Math.max(min!, max!);
      normalized[tag] = Math.min(hi, Math.max(lo, raw!));
      return;
    }
    normalized[tag] = raw!;
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function getFontsourceVariableSettings(
  slug: unknown,
  variableAxes: VariableAxesMap | null = null,
): Record<string, number> | null {
  const key = normalizeSlug(slug);
  if (!key) return null;
  const cache = safeReadCache();
  const entry = cache[key];
  if (!entry || typeof entry !== 'object') return null;

  const settings = sanitizeSettingsByAxes(entry.settings, variableAxes);
  return settings && Object.keys(settings).length > 0 ? settings : null;
}

export function setFontsourceVariableSettings(
  slug: unknown,
  settings: Record<string, unknown> | null | undefined,
  variableAxes: VariableAxesMap | null = null,
): void {
  const key = normalizeSlug(slug);
  if (!key) return;
  const normalizedSettings = sanitizeSettingsByAxes(settings, variableAxes);
  if (!normalizedSettings) return;

  const cache = safeReadCache();
  const next: Record<string, CacheEntry> = {
    ...cache,
    [key]: {
      settings: normalizedSettings,
      updatedAt: Date.now(),
    },
  };

  const keys = Object.keys(next);
  if (keys.length > FONTSOURCE_VARIABLE_SETTINGS_CACHE_LIMIT) {
    keys
      .sort((a, b) => Number(next[b]?.updatedAt || 0) - Number(next[a]?.updatedAt || 0))
      .slice(FONTSOURCE_VARIABLE_SETTINGS_CACHE_LIMIT)
      .forEach((extraKey) => {
        delete next[extraKey];
      });
  }

  safeWriteCache(next);
}

export function clearFontsourceVariableSettings(slug: unknown): void {
  const key = normalizeSlug(slug);
  if (!key) return;
  const cache = safeReadCache();
  if (!(key in cache)) return;
  delete cache[key];
  safeWriteCache(cache);
}
