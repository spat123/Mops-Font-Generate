import type { SessionFontRecord } from './editorFonts';

export type FontViewStateRestorePlan =
  | { mode: 'noop' }
  | { mode: 'axes'; source: string; settings: Record<string, number> }
  | { mode: 'preset'; source: string; presetName: string; clearVariableSettings?: boolean }
  | {
      mode: 'fallback';
      source: string;
      presetName: string;
      variableSettings?: Record<string, number> | null;
      clearVariableSettings?: boolean;
    };

export type BuildFontViewStateRestorePlanOptions = {
  localStorageVariableSettingsRaw?: string | null;
  localStoragePresetName?: string | null;
  getFontsourceCachedSettings?: ((font: SessionFontRecord) => Record<string, number> | null) | null;
  includeLocalStorageAxesForVariable?: boolean;
  includeLocalStoragePresetForVariable?: boolean;
  includeFontsourceCacheForVariable?: boolean;
  staticPresetPriority?: 'font-first' | 'storage-first';
  resolveDefaultVariableSettings?: ((font: SessionFontRecord) => Record<string, number> | null) | null;
  clearVariableSettingsForStatic?: boolean;
};

export type FontViewStatePatch = Partial<
  Pick<
    SessionFontRecord,
    'lastUsedVariableSettings' | 'lastUsedPresetName' | 'currentWeight' | 'currentStyle'
  >
>;
