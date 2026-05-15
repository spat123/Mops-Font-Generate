import { useEffect, useRef } from 'react';
import { collectPerFontPreviewSnapshot, applyPerFontPreviewSnapshot } from '../utils/perFontPreviewSettings';
import { updateFontSettings } from '../utils/db';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { EDITOR_MAIN_TAB_PENDING, isFontTabId } from '../utils/editorShellStorage';
import { previewTextDbg, previewTextSnippet } from '../utils/previewTextDebugLog';

/**
 * Preview settings сохраняются на каждом tab-шрифте (previewSettings на объекте шрифта в IndexedDB).
 * - при переключении вкладок: сохраняем snapshot на предыдущем табе и применяем snapshot нового
 * - при редактировании внутри активного таба: дебаунсом пишем snapshot (чтобы F5 не терял изменения)
 * - при pagehide/visibilitychange: пытаемся зафлашить snapshot
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
}) {
  const lastMainTabForPreviewRef = useRef(null);
  const mainTabRef = useRef(mainTab);
  mainTabRef.current = mainTab;

  /** Смена вкладки: save prev snapshot + apply next snapshot */
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
        snippet: previewTextSnippet(snap.text, 120),
      });
      setFonts((fs) => fs.map((f) => (f.id === prevTab ? { ...f, previewSettings: { ...snap } } : f)));
      updateFontSettings(prevTab, { previewSettings: snap })
        .then(() => previewTextDbg('tab switch: IDB save prev OK', { prevTab }))
        .catch((err) => previewTextDbg('tab switch: IDB save prev FAIL', { prevTab, err: String(err) }));
      }
    }

    if (isFontTabId(nextTab)) {
      if (!isInitialLoadComplete) {
        previewTextDbg('tab switch: пропускаем apply (шрифты ещё грузятся)', { nextTab });
      } else {
      const font = fonts.find((f) => f.id === nextTab);
      if (!font) {
        previewTextDbg('tab switch: шрифт ещё не в state — ждём', { nextTab });
      } else if (font?.previewSettings) {
        previewTextDbg('tab switch: применяем previewSettings шрифта', {
          nextTab,
          textLen:
            typeof font.previewSettings.text === 'string' ? font.previewSettings.text.length : 0,
          snippet: previewTextSnippet(font.previewSettings.text, 120),
        });
        applyPerFontPreviewSnapshot(font.previewSettings, previewSettersRef.current);
      } else {
        // Важно: не затираем глобальный текст/настройки дефолтом, если previewSettings ещё не восстановились.
        // Иначе после F5 можно «срезать» введённые пользователем строки.
        previewTextDbg('tab switch: previewSettings нет — не затираем дефолтом', { nextTab });
      }
      }
    } else if (nextTab === 'library' || nextTab.startsWith(EMPTY_PREFIX)) {
      previewTextDbg('tab switch: библиотека / пустая вкладка — дефолтный snapshot', { nextTab });
      applyPerFontPreviewSnapshot(getDefaultPreviewSettingsSnapshot(), previewSettersRef.current);
    }

    lastMainTabForPreviewRef.current = nextTab;
  }, [
    isInitialLoadComplete,
    mainTab,
    fonts,
    setFonts,
    previewSettersRef,
    previewSettingsValuesRef,
    getDefaultPreviewSettingsSnapshot,
  ]);

  /** Активный таб-шрифта: дебаунсом сохраняем snapshot на каждом изменении (в т.ч. text). */
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
        snippet: previewTextSnippet(snap.text, 120),
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

  /** Страховка: при сворачивании/перезагрузке — попытаться зафлашить snapshot в IndexedDB. */
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
        snippet: previewTextSnippet(snap.text, 120),
      });
      updateFontSettings(tabId, { previewSettings: snap })
        .then(() => previewTextDbg('pagehide/visibility: IDB flush OK', { tabId }))
        .catch((err) => previewTextDbg('pagehide/visibility: IDB flush FAIL', { tabId, err: String(err) }));
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

