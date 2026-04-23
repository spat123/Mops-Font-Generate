const FONTSOURCE_VARIABLE_SETTINGS_CACHE_KEY = 'mops-fontsource-variable-settings-v1';
const FONTSOURCE_VARIABLE_SETTINGS_CACHE_LIMIT = 120;

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeReadCache() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FONTSOURCE_VARIABLE_SETTINGS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function safeWriteCache(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FONTSOURCE_VARIABLE_SETTINGS_CACHE_KEY, JSON.stringify(payload || {}));
  } catch (error) {
    // no-op
  }
}

function sanitizeSettingsByAxes(settings, variableAxes) {
  if (!settings || typeof settings !== 'object') return null;
  if (!variableAxes || typeof variableAxes !== 'object') return null;

  const allowedTags = Object.keys(variableAxes);
  if (allowedTags.length === 0) return null;

  const normalized = {};
  allowedTags.forEach((tag) => {
    const axis = variableAxes[tag];
    if (!axis || typeof axis !== 'object') return;
    const raw = toFiniteNumber(settings[tag]);
    if (!Number.isFinite(raw)) return;

    const min = toFiniteNumber(axis.min);
    const max = toFiniteNumber(axis.max);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      normalized[tag] = Math.min(hi, Math.max(lo, raw));
      return;
    }
    normalized[tag] = raw;
  });

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function getFontsourceVariableSettings(slug, variableAxes = null) {
  const key = normalizeSlug(slug);
  if (!key) return null;
  const cache = safeReadCache();
  const entry = cache[key];
  if (!entry || typeof entry !== 'object') return null;

  const settings = sanitizeSettingsByAxes(entry.settings, variableAxes);
  return settings && Object.keys(settings).length > 0 ? settings : null;
}

export function setFontsourceVariableSettings(slug, settings, variableAxes = null) {
  const key = normalizeSlug(slug);
  if (!key) return;
  const normalizedSettings = sanitizeSettingsByAxes(settings, variableAxes);
  if (!normalizedSettings) return;

  const cache = safeReadCache();
  const next = {
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

export function clearFontsourceVariableSettings(slug) {
  const key = normalizeSlug(slug);
  if (!key) return;
  const cache = safeReadCache();
  if (!(key in cache)) return;
  delete cache[key];
  safeWriteCache(cache);
}
