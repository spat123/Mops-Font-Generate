import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { ENTIRE_PRINTABLE_ASCII_SAMPLE } from '../utils/previewSampleStrings';
import { collectPerFontPreviewSnapshot, applyPerFontPreviewSnapshot } from '../utils/perFontPreviewSettings';
import { updateFontSettings } from '../utils/db';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { EDITOR_MAIN_TAB_PENDING, isFontTabId } from '../utils/editorShellStorage';
import { previewTextDbg, previewTextSnippet } from '../utils/previewTextDebugLog';
import type { SessionFontRecord } from '../types/editorFonts';

type PreviewSettingsSnapshot = Record<string, unknown>;

type UsePerFontPreviewPersistenceParams = {
  hasRestoredEditorMainTab: boolean;
  isInitialLoadComplete: boolean;
  mainTab: string;
  fonts: SessionFontRecord[];
  setFonts: Dispatch<SetStateAction<SessionFontRecord[]>>;
  previewSettingsValuesRef: MutableRefObject<PreviewSettingsSnapshot>;
  previewSettersRef: MutableRefObject<Record<string, unknown>>;
  getDefaultPreviewSettingsSnapshot: () => PreviewSettingsSnapshot;
  previewSettingsDeps?: unknown[];
  snapshotDebounceMs?: number;
};

/**
 * Preview settings на каждом tab-шрифте (previewSettings в IndexedDB).
 */
export function usePerFontPreviewPersistence({
  hasRestoredEditorMainTab,
  isInitialLoadComplete,
  mainTab,
  fonts,
  setFonts,
  previewSettingsValuesRef,
  previewSettersRef,
  getDefaultPreviewSettingsSnapshot,
  previewSettingsDeps = [],
  snapshotDebounceMs = 450,
}: UsePerFontPreviewPersistenceParams): void {
  const lastMainTabForPreviewRef = useRef<string | null>(null);
  const lastAppliedTabForPreviewRef = useRef<string | null>(null);
  const mainTabRef = useRef(mainTab);
  mainTabRef.current = mainTab;

  useEffect(() => {
    const prevTab = lastMainTabForPreviewRef.current;
    const nextTab = mainTab;
    previewTextDbg('tab switch: эффект mainTab', { prevTab, nextTab });

    if (nextTab === EDITOR_MAIN_TAB_PENDING) {
      lastMainTabForPreviewRef.current = nextTab;
      return;
    }

    if (prevTab !== null && prevTab !== nextTab && isFontTabId(prevTab)) {
      if (!isInitialLoadComplete) {
        previewTextDbg('tab switch: пропускаем save prev (шрифты ещё грузятся)', { prevTab, nextTab });
      } else {
        const snap = collectPerFontPreviewSnapshot(previewSettingsValuesRef.current);
        previewTextDbg('tab switch: сохраняем snapshot предыдущей вкладки (state + IDB)', {
          prevTab,
          nextTab,
          textLen: typeof snap.text === 'string' ? snap.text.length : 0,
          snippet: previewTextSnippet(snap.text as string, 120),
        });
        setFonts((fs) =>
          fs.map((f) => (f.id === prevTab ? { ...f, previewSettings: { ...snap } } : f)),
        );
        updateFontSettings(prevTab, { previewSettings: snap })
          .then(() => previewTextDbg('tab switch: IDB save prev OK', { prevTab }))
          .catch((err) => previewTextDbg('tab switch: IDB save prev FAIL', { prevTab, err: String(err) }));
      }
    }

    const tabChanged = prevTab !== nextTab;
    if (tabChanged) {
      lastAppliedTabForPreviewRef.current = null;
    }

    if (isFontTabId(nextTab)) {
      if (!isInitialLoadComplete) {
        previewTextDbg('tab switch: пропускаем apply (шрифты ещё грузятся)', { nextTab });
      } else if (lastAppliedTabForPreviewRef.current === nextTab) {
        lastMainTabForPreviewRef.current = nextTab;
        return;
      } else {
        const font = fonts.find((f) => f.id === nextTab);
        if (!font) {
          previewTextDbg('tab switch: шрифт ещё не в state — ждём', { nextTab });
        } else if (font?.previewSettings) {
          previewTextDbg('tab switch: применяем previewSettings шрифта', {
            nextTab,
            textLen:
              typeof font.previewSettings.text === 'string' ? font.previewSettings.text.length : 0,
            snippet: previewTextSnippet(font.previewSettings.text as string, 120),
          });
          applyPerFontPreviewSnapshot(
            font.previewSettings,
            previewSettersRef.current as Record<string, (...args: unknown[]) => void>,
          );
          lastAppliedTabForPreviewRef.current = nextTab;
        } else {
          const currentText = previewSettingsValuesRef.current.text;
          if (typeof currentText === 'string' && !currentText.trim()) {
            previewTextDbg('tab switch: глобальный текст пуст — подставляем образец', { nextTab });
            applyPerFontPreviewSnapshot(
              { text: ENTIRE_PRINTABLE_ASCII_SAMPLE },
              previewSettersRef.current as Record<string, (...args: unknown[]) => void>,
            );
          } else {
            previewTextDbg('tab switch: previewSettings нет — не затираем дефолтом', { nextTab });
          }
        }
      }
    } else if (nextTab === 'library' || nextTab.startsWith(EMPTY_PREFIX)) {
      if (!hasRestoredEditorMainTab) {
        previewTextDbg('tab switch: пропускаем дефолтный snapshot до восстановления mainTab', { nextTab });
      } else {
        previewTextDbg(
          'tab switch: библиотека / пустая вкладка — дефолтный snapshot (глобальный текст станет DEFAULT_PREVIEW_TEXT)',
          { nextTab, hasRestoredEditorMainTab },
        );
        applyPerFontPreviewSnapshot(
          getDefaultPreviewSettingsSnapshot(),
          previewSettersRef.current as Record<string, (...args: unknown[]) => void>,
        );
        lastAppliedTabForPreviewRef.current = nextTab;
      }
    }

    lastMainTabForPreviewRef.current = nextTab;
  }, [
    hasRestoredEditorMainTab,
    isInitialLoadComplete,
    mainTab,
    fonts,
    setFonts,
    previewSettersRef,
    previewSettingsValuesRef,
    getDefaultPreviewSettingsSnapshot,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasRestoredEditorMainTab) return;
    if (!isInitialLoadComplete) return;
    if (!isFontTabId(mainTab)) return;

    const tabId = mainTab;
    const timer = window.setTimeout(() => {
      const snap = collectPerFontPreviewSnapshot(previewSettingsValuesRef.current);
      previewTextDbg('debounced: запись previewSettings в IDB', {
        tabId,
        textLen: typeof snap.text === 'string' ? snap.text.length : 0,
        snippet: previewTextSnippet(snap.text as string, 120),
      });
      updateFontSettings(tabId, { previewSettings: snap })
        .then(() => previewTextDbg('debounced: IDB OK', { tabId }))
        .catch((err) => previewTextDbg('debounced: IDB FAIL', { tabId, err: String(err) }));
    }, Math.max(0, Number(snapshotDebounceMs) || 0));

    return () => window.clearTimeout(timer);
  }, [
    hasRestoredEditorMainTab,
    isInitialLoadComplete,
    mainTab,
    previewSettingsValuesRef,
    snapshotDebounceMs,
    ...previewSettingsDeps,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const flush = () => {
      if (!hasRestoredEditorMainTab) return;
      if (!isInitialLoadComplete) return;
      const tabId = mainTabRef.current;
      if (!isFontTabId(tabId)) return;
      const snap = collectPerFontPreviewSnapshot(previewSettingsValuesRef.current);
      previewTextDbg('pagehide/visibility: flush previewSettings в IDB', {
        tabId,
        textLen: typeof snap.text === 'string' ? snap.text.length : 0,
        snippet: previewTextSnippet(snap.text as string, 120),
      });
      updateFontSettings(tabId, { previewSettings: snap })
        .then(() => previewTextDbg('pagehide/visibility: IDB flush OK', { tabId }))
        .catch((err) =>
          previewTextDbg('pagehide/visibility: IDB flush FAIL', { tabId, err: String(err) }),
        );
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hasRestoredEditorMainTab, isInitialLoadComplete, previewSettingsValuesRef]);
}
