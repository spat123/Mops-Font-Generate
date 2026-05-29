export const APP_CACHE_KEYS = {
  /** useFontPersistence.ts */
  fontUi: {
    selectedFontId: 'selectedFontId',
    lastPresetName: 'lastPresetName',
    lastVariableSettings: 'lastVariableSettings',
  },
  /** fontsourceVariableSettingsCache.ts */
  fontsourceVariableSettings: 'dinamic-fontsource-variable-settings-v1',
  /** editorShellStorage.ts */
  editorShell: {
    mainTab: 'editorMainTab',
    emptySlots: 'editorEmptySlots',
    closedLibraryFontTabIds: 'editorClosedLibraryFontTabIds',
    fontsLibraryInnerTab: 'fontsLibraryInnerTab',
    sessionFontOrder: 'dinamicSessionFontOrder',
  },
  /** editorShellStorage.ts */
  session: {
    sessionFontTabsPreview: 'dinamicSessionFontTabsPreview',
  },
} as const;

type CacheClearReport = {
  removed: Array<{ storage: 'localStorage' | 'sessionStorage'; key: string; existed: boolean }>;
  errors: Array<{ storage: 'localStorage' | 'sessionStorage'; key: string; error: string }>;
};

function safeRemove(storage: 'localStorage' | 'sessionStorage', key: string, report: CacheClearReport) {
  if (typeof window === 'undefined') return;
  try {
    const s = storage === 'localStorage' ? window.localStorage : window.sessionStorage;
    const existed = s.getItem(key) !== null;
    s.removeItem(key);
    report.removed.push({ storage, key, existed });
  } catch (e) {
    report.errors.push({
      storage,
      key,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export function clearFontUiCache(): CacheClearReport {
  const report: CacheClearReport = { removed: [], errors: [] };
  safeRemove('localStorage', APP_CACHE_KEYS.fontUi.selectedFontId, report);
  safeRemove('localStorage', APP_CACHE_KEYS.fontUi.lastPresetName, report);
  safeRemove('localStorage', APP_CACHE_KEYS.fontUi.lastVariableSettings, report);
  return report;
}

export function clearFontsourceVariableSettingsCache(): CacheClearReport {
  const report: CacheClearReport = { removed: [], errors: [] };
  safeRemove('localStorage', APP_CACHE_KEYS.fontsourceVariableSettings, report);
  return report;
}

export function clearEditorShellCache(): CacheClearReport {
  const report: CacheClearReport = { removed: [], errors: [] };
  safeRemove('localStorage', APP_CACHE_KEYS.editorShell.mainTab, report);
  safeRemove('localStorage', APP_CACHE_KEYS.editorShell.emptySlots, report);
  safeRemove('localStorage', APP_CACHE_KEYS.editorShell.closedLibraryFontTabIds, report);
  safeRemove('localStorage', APP_CACHE_KEYS.editorShell.fontsLibraryInnerTab, report);
  safeRemove('localStorage', APP_CACHE_KEYS.editorShell.sessionFontOrder, report);
  return report;
}

export function clearSessionPreviewCache(): CacheClearReport {
  const report: CacheClearReport = { removed: [], errors: [] };
  safeRemove('sessionStorage', APP_CACHE_KEYS.session.sessionFontTabsPreview, report);
  return report;
}

export function clearAllKnownCaches(): CacheClearReport {
  const report: CacheClearReport = { removed: [], errors: [] };
  const merge = (r: CacheClearReport) => {
    report.removed.push(...r.removed);
    report.errors.push(...r.errors);
  };
  merge(clearFontUiCache());
  merge(clearFontsourceVariableSettingsCache());
  merge(clearEditorShellCache());
  merge(clearSessionPreviewCache());
  return report;
}

