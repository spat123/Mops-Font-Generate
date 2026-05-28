import type { SessionFontRecord } from '../types/editorFonts';
import type {
  BuildFontViewStateRestorePlanOptions,
  FontViewStateRestorePlan,
} from '../types/fontViewState';

function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && Object.keys(value).length > 0;
}

function parseVariableSettingsFromStorage(raw: string | null | undefined): Record<string, number> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isNonEmptyObject(parsed) ? (parsed as Record<string, number>) : null;
  } catch {
    return null;
  }
}

type PickCandidate =
  | { kind: 'axes'; source: string; value: Record<string, number> | null | undefined }
  | { kind: 'preset'; source: string; value: string | null | undefined; getValue?: () => string };

function pickFirstValue(
  candidates: PickCandidate[],
): { source: string; value: Record<string, number> | string } | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const value =
      typeof (candidate as { getValue?: () => string }).getValue === 'function'
        ? (candidate as { getValue: () => string }).getValue()
        : candidate.value;
    if (candidate.kind === 'axes') {
      if (isNonEmptyObject(value)) {
        return { source: candidate.source, value: value as Record<string, number> };
      }
      continue;
    }
    if (typeof value === 'string' && value.trim()) {
      return { source: candidate.source, value: value.trim() };
    }
  }
  return null;
}

export function buildFontViewStateRestorePlan(
  font: SessionFontRecord | null | undefined,
  options: BuildFontViewStateRestorePlanOptions = {},
): FontViewStateRestorePlan {
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
      { kind: 'axes', source: 'font-db', value: font.lastUsedVariableSettings as Record<string, number> | null },
      { kind: 'axes', source: 'fontsource-cache', value: fontsourceAxes },
      { kind: 'axes', source: 'local-storage', value: localStorageAxes },
    ]);
    if (axisCandidate && typeof axisCandidate.value === 'object') {
      return {
        mode: 'axes',
        source: axisCandidate.source,
        settings: axisCandidate.value,
      };
    }

    const presetCandidate = pickFirstValue([
      { kind: 'preset', source: 'font-db', value: font.lastUsedPresetName as string | null },
      ...(includeLocalStoragePresetForVariable
        ? [{ kind: 'preset' as const, source: 'local-storage', value: localStoragePresetName }]
        : []),
    ]);
    if (presetCandidate && typeof presetCandidate.value === 'string') {
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

  const staticCandidates: PickCandidate[] =
    staticPresetPriority === 'storage-first'
      ? [
          { kind: 'preset', source: 'local-storage', value: localStoragePresetName },
          { kind: 'preset', source: 'font-db', value: font.lastUsedPresetName as string | null },
        ]
      : [
          { kind: 'preset', source: 'font-db', value: font.lastUsedPresetName as string | null },
          { kind: 'preset', source: 'local-storage', value: localStoragePresetName },
        ];

  const presetCandidate = pickFirstValue(staticCandidates);
  if (presetCandidate && typeof presetCandidate.value === 'string') {
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
