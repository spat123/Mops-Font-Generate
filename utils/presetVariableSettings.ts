import type { SessionFontRecord } from '../types/editorFonts';

function clampAxisScalar(value: number, axis: unknown): number {
  if (
    axis &&
    typeof axis === 'object' &&
    Number.isFinite(Number((axis as { min?: number }).min)) &&
    Number.isFinite(Number((axis as { max?: number }).max))
  ) {
    const a = Math.min(Number((axis as { min: number }).min), Number((axis as { max: number }).max));
    const b = Math.max(Number((axis as { min: number }).min), Number((axis as { max: number }).max));
    return Math.min(b, Math.max(a, value));
  }
  return value;
}

export type BuildPresetVariableSettingsParams = {
  font: SessionFontRecord;
  weight: number;
  style: string;
  instanceCoordinates?: Record<string, number> | null;
  currentSettings: Record<string, number>;
};

/**
 * Настройки осей VF при выборе пресета (instance coordinates или wght/ital/slnt).
 */
export function buildVariableSettingsForPresetApply({
  font,
  weight,
  style,
  instanceCoordinates = null,
  currentSettings,
}: BuildPresetVariableSettingsParams): { settings: Record<string, number>; changed: boolean } {
  const currentAxes = font.variableAxes || {};
  const italicMode = typeof font.italicMode === 'string' ? font.italicMode : 'none';
  const newSettings = { ...currentSettings };
  let settingsChanged = false;

  if (instanceCoordinates && Object.keys(instanceCoordinates).length > 0) {
    for (const [tag, rawValue] of Object.entries(instanceCoordinates)) {
      if (!(tag in currentAxes)) continue;
      let value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      value = clampAxisScalar(value, currentAxes[tag]);
      if (newSettings[tag] !== value) {
        newSettings[tag] = value;
        settingsChanged = true;
      }
    }
    return { settings: newSettings, changed: settingsChanged };
  }

  if ('wght' in currentAxes) {
    const w = clampAxisScalar(weight, currentAxes.wght);
    if (newSettings.wght !== w) {
      newSettings.wght = w;
      settingsChanged = true;
    }
  }

  const targetItal = style === 'italic' ? 1 : 0;
  const slantAxis = typeof currentAxes.slnt === 'object' ? currentAxes.slnt : undefined;
  const targetSlnt = style === 'italic' ? (slantAxis?.min ?? -15) : (slantAxis?.default ?? 0);

  if (italicMode === 'axis-ital' && 'ital' in currentAxes) {
    if (newSettings.ital !== targetItal) {
      newSettings.ital = targetItal;
      settingsChanged = true;
      if ('slnt' in newSettings) delete newSettings.slnt;
    }
  } else if (italicMode === 'axis-slnt' && 'slnt' in currentAxes) {
    if (newSettings.slnt !== targetSlnt) {
      newSettings.slnt = targetSlnt;
      settingsChanged = true;
      if ('ital' in newSettings) delete newSettings.ital;
    }
  }

  return { settings: newSettings, changed: settingsChanged };
}
