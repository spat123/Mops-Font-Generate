/** Шрифт в сессии редактора (IndexedDB + runtime). */
export type SessionFontRecord = {
  id: string;
  name?: string;
  displayName?: string;
  fontFamily?: string;
  source?: string;
  url?: string;
  file?: Blob;
  originalName?: string;
  isVariableFont?: boolean;
  variableAxes?: Record<
    string,
    { name?: string; min?: number; max?: number; default?: number; currentValue?: number; step?: number }
  >;
  filename?: string;
  supportedAxes?: string[];
  variationSettings?: string;
  italicMode?: string;
  hasItalicStyles?: boolean;
  loadedStyles?: Array<{ weight?: number; style?: string; cached?: boolean }>;
  previewSettings?: Record<string, unknown> & { text?: string };
  lastUsedPresetName?: string | null;
  lastUsedVariableSettings?: Record<string, number> | null;
  currentWeight?: number;
  currentStyle?: string;
  availableStyles?: Array<{ name?: string; weight?: number; style?: string; coordinates?: Record<string, number> }>;
  arrayBuffer?: ArrayBuffer;
  [key: string]: unknown;
};

/** Сохранённая пользовательская библиотека. */
export type SavedLibraryRecord = {
  id: string;
  name: string;
  fonts?: Array<{
    id: string;
    label?: string;
    source?: string;
    addedAt?: number;
    isVariable?: boolean;
  }>;
};

export type TabStripPlaceholder = { id: string; label: string };
