import {
  clampPresetNameForVariableAxes,
  findStyleInfoByWeightAndStyle,
  getFontAvailableStyles,
  resolveDefaultStaticPresetName,
} from './fontUtilsCommon';
import type { SessionFontRecord } from '../types/editorFonts';

/**
 * Имя пресета для UI (сайдбар / табы) по текущему шрифту и live variableSettings.
 */
export function resolveSelectedPresetDisplayName(
  font: SessionFontRecord | null | undefined,
  variableSettings: Record<string, number> | null | undefined,
): string {
  if (!font) return 'Regular';

  if (!font.isVariableFont) {
    const available = getFontAvailableStyles(font);

    if (font.currentWeight !== undefined && font.currentStyle !== undefined) {
      const w = Number(font.currentWeight);
      const st = font.currentStyle === 'italic' ? 'italic' : 'normal';
      const hit = available.find((s) => Number(s?.weight) === w && String(s?.style) === st);
      if (hit?.name) return hit.name;

      const styleInfo = findStyleInfoByWeightAndStyle(w, st);
      return styleInfo?.name || 'Regular';
    }

    if (font.lastUsedPresetName) {
      return String(font.lastUsedPresetName);
    }

    return resolveDefaultStaticPresetName(font);
  }

  const liveAxes =
    variableSettings && Object.keys(variableSettings).length > 0 ? variableSettings : null;
  const storedAxes =
    font.lastUsedVariableSettings &&
    typeof font.lastUsedVariableSettings === 'object' &&
    Object.keys(font.lastUsedVariableSettings).length > 0
      ? font.lastUsedVariableSettings
      : null;
  const axisSource = liveAxes || storedAxes;

  let candidate = 'Regular';
  let hintW = 400;
  let hintStyle = 'normal';

  if (axisSource) {
    hintW = axisSource.wght != null ? Number(axisSource.wght) : 400;
    hintStyle =
      axisSource.ital === 1 || (axisSource.slnt != null && Number(axisSource.slnt) < 0)
        ? 'italic'
        : 'normal';
    if (font.italicMode === 'separate-style') {
      hintStyle = font.currentStyle === 'italic' ? 'italic' : 'normal';
    }
    const matchedPreset = findStyleInfoByWeightAndStyle(hintW, hintStyle);
    if (matchedPreset) candidate = matchedPreset.name;
  } else if (font.lastUsedPresetName) {
    candidate = String(font.lastUsedPresetName);
    hintW =
      font.currentWeight != null && Number.isFinite(Number(font.currentWeight))
        ? Number(font.currentWeight)
        : 400;
    hintStyle = font.currentStyle === 'italic' ? 'italic' : 'normal';
  }

  return clampPresetNameForVariableAxes(candidate, font.variableAxes, hintW, hintStyle, {
    italicMode: font.italicMode,
  });
}
