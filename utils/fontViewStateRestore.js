function isNonEmptyObject(value) {
  return Boolean(value) && typeof value === 'object' && Object.keys(value).length > 0;
}

function parseVariableSettingsFromStorage(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isNonEmptyObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function pickFirstValue(candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = typeof candidate.getValue === 'function' ? candidate.getValue() : candidate.value;
    if (candidate.kind === 'axes') {
      if (isNonEmptyObject(value)) {
        return { source: candidate.source, value };
      }
      continue;
    }
    if (typeof value === 'string' && value.trim()) {
      return { source: candidate.source, value: value.trim() };
    }
  }
  return null;
}

export function buildFontViewStateRestorePlan(font, options = {}) {
  const {
    localStorageVariableSettingsRaw = null,
    localStoragePresetName = null,
    getFontsourceCachedSettings = null,
    includeLocalStorageAxesForVariable = false,
    includeLocalStoragePresetForVariable = false,
    includeFontsourceCacheForVariable = false,
    staticPresetPriority = 'font-first',
    resolveDefaultVariableSettings = null,
    clearVariableSettingsForStatic = false,
  } = options;

  if (!font) return { mode: 'noop' };

  const localStorageAxes = includeLocalStorageAxesForVariable
    ? parseVariableSettingsFromStorage(localStorageVariableSettingsRaw)
    : null;
  const fontsourceAxes =
    includeFontsourceCacheForVariable && typeof getFontsourceCachedSettings === 'function'
      ? getFontsourceCachedSettings(font)
      : null;

  if (font.isVariableFont) {
    const axisCandidate = pickFirstValue([
      { kind: 'axes', source: 'font-db', value: font.lastUsedVariableSettings },
      { kind: 'axes', source: 'fontsource-cache', value: fontsourceAxes },
      { kind: 'axes', source: 'local-storage', value: localStorageAxes },
    ]);
    if (axisCandidate) {
      return {
        mode: 'axes',
        source: axisCandidate.source,
        settings: axisCandidate.value,
      };
    }

    const presetCandidate = pickFirstValue([
      { kind: 'preset', source: 'font-db', value: font.lastUsedPresetName },
      ...(includeLocalStoragePresetForVariable
        ? [{ kind: 'preset', source: 'local-storage', value: localStoragePresetName }]
        : []),
    ]);
    if (presetCandidate) {
      return {
        mode: 'preset',
        source: presetCandidate.source,
        presetName: presetCandidate.value,
      };
    }

    const defaultSettings =
      typeof resolveDefaultVariableSettings === 'function'
        ? resolveDefaultVariableSettings(font)
        : null;

    return {
      mode: 'fallback',
      source: 'default',
      presetName: 'Regular',
      variableSettings: isNonEmptyObject(defaultSettings) ? defaultSettings : null,
    };
  }

  const staticCandidates =
    staticPresetPriority === 'storage-first'
      ? [
          { kind: 'preset', source: 'local-storage', value: localStoragePresetName },
          { kind: 'preset', source: 'font-db', value: font.lastUsedPresetName },
        ]
      : [
          { kind: 'preset', source: 'font-db', value: font.lastUsedPresetName },
          { kind: 'preset', source: 'local-storage', value: localStoragePresetName },
        ];

  const presetCandidate = pickFirstValue(staticCandidates);
  if (presetCandidate) {
    return {
      mode: 'preset',
      source: presetCandidate.source,
      presetName: presetCandidate.value,
      clearVariableSettings: clearVariableSettingsForStatic,
    };
  }

  return {
    mode: 'fallback',
    source: 'default',
    presetName: 'Regular',
    clearVariableSettings: clearVariableSettingsForStatic,
  };
}
