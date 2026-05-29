import type { SessionFontRecord } from '../types/editorFonts';
import type { FontViewStatePatch } from '../types/fontViewState';

function cloneSettings(settings: Record<string, number> | null | undefined): Record<string, number> | null {
  return settings && typeof settings === 'object' ? { ...settings } : null;
}

function hasSettings(settings: Record<string, number> | null | undefined): boolean {
  return Boolean(settings) && typeof settings === 'object' && Object.keys(settings).length > 0;
}

export function buildVariableSettingsViewStatePatch(
  settings: Record<string, number> | null | undefined,
  options: { clearPresetName?: boolean } = {},
): FontViewStatePatch {
  const { clearPresetName = true } = options;

  const normalizedSettings = cloneSettings(settings);
  const patch: FontViewStatePatch = {
    lastUsedVariableSettings: normalizedSettings,
  };

  if (clearPresetName) {
    patch.lastUsedPresetName = null;
  }

  return patch;
}

export function buildPresetViewStatePatch(
  presetName: string | null | undefined,
  options: {
    clearVariableSettings?: boolean;
    currentWeight?: number;
    currentStyle?: string;
  } = {},
): FontViewStatePatch {
  const { clearVariableSettings = false, currentWeight, currentStyle } = options;

  const patch: FontViewStatePatch = {
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

export function buildResetFontViewStatePatch(): FontViewStatePatch {
  return {
    lastUsedVariableSettings: null,
    lastUsedPresetName: null,
    currentWeight: null,
    currentStyle: null,
  };
}

export function buildPersistedFontViewStatePatch(
  font: SessionFontRecord | null | undefined,
  options: {
    variableSettings?: Record<string, number> | null;
    presetName?: string | null;
  } = {},
): FontViewStatePatch {
  const { variableSettings = null, presetName = null } = options;

  const metaPatch: FontViewStatePatch = {};
  if (font?.currentWeight != null) {
    metaPatch.currentWeight = font.currentWeight;
  }
  if (font?.currentStyle != null) {
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
