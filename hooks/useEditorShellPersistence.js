import { useEffect, useLayoutEffect, useState } from 'react';
import {
  EDITOR_CLOSED_LIBRARY_FONT_IDS_LS_KEY,
  EDITOR_EMPTY_SLOTS_LS_KEY,
  EDITOR_MAIN_TAB_LS_KEY,
  EDITOR_MAIN_TAB_PENDING,
  FONTS_LIBRARY_INNER_TAB_LS_KEY,
  SESSION_FONT_ORDER_LS_KEY,
  SESSION_FONT_TABS_PREVIEW_KEY,
  readEditorShellFromStorage,
} from '../utils/editorShellStorage';
import { SAVED_LIBRARY_TAB_PREFIX } from '../utils/savedLibraryTabIds';
import { editorShellDbg } from '../utils/editorShellDebugLog';
import { previewTextDbg } from '../utils/previewTextDebugLog';

/**
 * Восстанавливает shell редактора (активная вкладка, пустые слоты, закрытые вкладки библиотеки, внутренняя вкладка «Все»)
 * синхронно до paint и затем синхронизирует изменения обратно в localStorage.
 */
export function useEditorShellPersistence({
  mainTab,
  emptySlotIds,
  closedLibraryFontIds,
  fontsLibraryTab,
  setMainTab,
  setEmptySlotIds,
  setClosedLibraryFontIds,
  setFontsLibraryTab,
  setTabStripPreviewFromCache,
  initialSessionFontOrderIdsRef,
}) {
  const [hasRestoredEditorMainTab, setHasRestoredEditorMainTab] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    let rawMainTabLs = null;
    try {
      rawMainTabLs = window.localStorage?.getItem(EDITOR_MAIN_TAB_LS_KEY) ?? null;
    } catch {
      rawMainTabLs = null;
    }
    editorShellDbg('layout#1: старт восстановления shell', { rawMainTabLs });
    try {
      const raw = sessionStorage.getItem(SESSION_FONT_TABS_PREVIEW_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (
          Array.isArray(p) &&
          p.length > 0 &&
          p.every((x) => x && typeof x.id === 'string' && (typeof x.label === 'string' || typeof x.name === 'string'))
        ) {
          setTabStripPreviewFromCache(
            p.map((x) => ({ id: x.id, label: (x.label || x.name || 'Шрифт').slice(0, 120) })),
          );
        }
      }
    } catch {
      /* ignore */
    }

    const shell = readEditorShellFromStorage();
    if (shell) {
      editorShellDbg('layout#1: readEditorShellFromStorage', {
        mainTab: shell.mainTab,
        emptySlotCount: Array.isArray(shell.emptySlotIds) ? shell.emptySlotIds.length : 0,
      });
      previewTextDbg('shell: восстановление mainTab из localStorage (до этого per-font snapshot мог ждать)', {
        mainTab: shell.mainTab,
      });
      setEmptySlotIds(shell.emptySlotIds);
      setMainTab(shell.mainTab);
    } else {
      editorShellDbg('layout#1: readEditorShellFromStorage вернул null', {});
      previewTextDbg('shell: readEditorShellFromStorage null — mainTab из shell не выставлен', {});
    }
    try {
      localStorage.removeItem('editorClosedFontTabIds');
    } catch {
      /* ignore */
    }

    try {
      const rawClosed = localStorage.getItem(EDITOR_CLOSED_LIBRARY_FONT_IDS_LS_KEY);
      if (rawClosed) {
        const parsed = JSON.parse(rawClosed);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((id) => typeof id === 'string' && id.length > 0)) {
          setClosedLibraryFontIds(parsed);
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const inner = localStorage.getItem(FONTS_LIBRARY_INNER_TAB_LS_KEY);
      if (inner === 'catalog' || inner?.startsWith(SAVED_LIBRARY_TAB_PREFIX)) {
        setFontsLibraryTab(inner);
      } else if (inner === 'session') {
        // Legacy-миграция старого значения внутренней вкладки.
        setFontsLibraryTab('catalog');
      }
    } catch {
      /* ignore */
    }

    try {
      const rawOrder = localStorage.getItem(SESSION_FONT_ORDER_LS_KEY);
      const parsed = rawOrder ? JSON.parse(rawOrder) : [];
      if (Array.isArray(parsed)) {
        initialSessionFontOrderIdsRef.current = parsed.filter((id) => typeof id === 'string');
      }
    } catch {
      /* ignore */
    }

    setHasRestoredEditorMainTab(true);
    editorShellDbg('layout#1: setHasRestoredEditorMainTab(true)', {});
    previewTextDbg('shell: hasRestoredEditorMainTab = true (можно применять дефолтный snapshot для library/empty)', {});
  }, [
    initialSessionFontOrderIdsRef,
    setClosedLibraryFontIds,
    setEmptySlotIds,
    setFontsLibraryTab,
    setMainTab,
    setTabStripPreviewFromCache,
  ]);

  /**
   * Делаем строку вкладок видимой только когда mainTab уже восстановлен.
   * Иначе может быть 1 кадр, где mainTab ещё "__editorShellPending__",
   * а CSS уже показал tabbar — и в этот кадр видна заглушка «Новый».
   */
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    if (!hasRestoredEditorMainTab) {
      editorShellDbg('layout#2: ждём hasRestoredEditorMainTab', { mainTab });
      return;
    }
    if (mainTab === EDITOR_MAIN_TAB_PENDING) {
      editorShellDbg('layout#2: mainTab ещё pending — editorUiReady не ставим', { mainTab });
      return;
    }
    try {
      document.documentElement.dataset.editorUiReady = '1';
      editorShellDbg('layout#2: dataset.editorUiReady=1', { mainTab });
    } catch {
      /* ignore */
    }
  }, [hasRestoredEditorMainTab, mainTab]);

  useEffect(() => {
    if (!hasRestoredEditorMainTab || typeof window === 'undefined') return;
    if (mainTab === EDITOR_MAIN_TAB_PENDING) return;
    try {
      window.localStorage.setItem(EDITOR_MAIN_TAB_LS_KEY, mainTab);
    } catch {
      /* ignore quota */
    }
  }, [mainTab, hasRestoredEditorMainTab]);

  useEffect(() => {
    if (!hasRestoredEditorMainTab || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(EDITOR_EMPTY_SLOTS_LS_KEY, JSON.stringify(emptySlotIds));
    } catch {
      /* ignore quota */
    }
  }, [emptySlotIds, hasRestoredEditorMainTab]);

  useEffect(() => {
    if (!hasRestoredEditorMainTab || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(EDITOR_CLOSED_LIBRARY_FONT_IDS_LS_KEY, JSON.stringify(closedLibraryFontIds));
    } catch {
      /* ignore quota */
    }
  }, [closedLibraryFontIds, hasRestoredEditorMainTab]);

  useEffect(() => {
    if (!hasRestoredEditorMainTab || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FONTS_LIBRARY_INNER_TAB_LS_KEY, fontsLibraryTab);
    } catch {
      /* ignore quota */
    }
  }, [fontsLibraryTab, hasRestoredEditorMainTab]);

  return hasRestoredEditorMainTab;
}

