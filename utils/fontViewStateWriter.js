function cloneSettings(settings) {
  return settings && typeof settings === 'object' ? { ...settings } : null;
}

function hasSettings(settings) {
  return Boolean(settings) && typeof settings === 'object' && Object.keys(settings).length > 0;
}

export function buildVariableSettingsViewStatePatch(settings, options = {}) {
  const {
    clearPresetName = true,
  } = options;

  const normalizedSettings = cloneSettings(settings);
  const patch = {
    lastUsedVariableSettings: normalizedSettings,
  };

  if (clearPresetName) {
    patch.lastUsedPresetName = null;
  }

  return patch;
}

export function buildPresetViewStatePatch(presetName, options = {}) {
  const {
    clearVariableSettings = false,
    currentWeight,
    currentStyle,
  } = options;

  const patch = {
    lastUsedPresetName: presetName || null,
  };

  if (clearVariableSettings) {
    patch.lastUsedVariableSettings = null;
  }

  if (currentWeight !== undefined) {
    patch.currentWeight = currentWeight;
  }

  if (currentStyle !== undefined) {
    patch.currentStyle = currentStyle;
  }

  return patch;
}

export function buildResetFontViewStatePatch() {
  return {
    lastUsedVariableSettings: null,
    lastUsedPresetName: null,
    currentWeight: null,
    currentStyle: null,
  };
}

export function buildPersistedFontViewStatePatch(font, options = {}) {
  const {
    variableSettings = null,
    presetName = null,
  } = options;

  const metaPatch = {};
  if (font?.currentWeight !== undefined) {
    metaPatch.currentWeight = font.currentWeight;
  }
  if (font?.currentStyle !== undefined) {
    metaPatch.currentStyle = font.currentStyle;
  }

  if (font?.isVariableFont && hasSettings(variableSettings)) {
    return {
      ...buildVariableSettingsViewStatePatch(variableSettings),
      ...metaPatch,
    };
  }

  if (presetName && presetName !== 'Regular') {
    return {
      ...buildPresetViewStatePatch(presetName, {
        clearVariableSettings: true,
      }),
      ...metaPatch,
    };
  }

  return metaPatch;
}
