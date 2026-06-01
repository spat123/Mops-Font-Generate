import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
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
import { hasCatalogEditorDeepLinkInSearch } from '../utils/catalogShareLink';
import { SAVED_LIBRARY_TAB_PREFIX } from '../utils/savedLibraryTabIds';
import { editorShellDbg } from '../utils/editorShellDebugLog';
import { previewTextDbg } from '../utils/previewTextDebugLog';
import type { TabStripPlaceholder } from '../types/editorFonts';

type UseEditorShellPersistenceParams = {
  mainTab: string;
  emptySlotIds: string[];
  closedLibraryFontIds: string[];
  fontsLibraryTab: string;
  setMainTab: Dispatch<SetStateAction<string>>;
  setEmptySlotIds: Dispatch<SetStateAction<string[]>>;
  setClosedLibraryFontIds: Dispatch<SetStateAction<string[]>>;
  setFontsLibraryTab: Dispatch<SetStateAction<string>>;
  setTabStripPreviewFromCache: Dispatch<SetStateAction<TabStripPlaceholder[]>>;
  initialSessionFontOrderIdsRef: MutableRefObject<string[]>;
};

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
}: UseEditorShellPersistenceParams): boolean {
  const [hasRestoredEditorMainTab, setHasRestoredEditorMainTab] = useState(false);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    let rawMainTabLs: string | null = null;
    try {
      rawMainTabLs = window.localStorage?.getItem(EDITOR_MAIN_TAB_LS_KEY) ?? null;
    } catch {
      rawMainTabLs = null;
    }
    editorShellDbg('layout#1: старт восстановления shell', { rawMainTabLs });
    try {
      const raw = sessionStorage.getItem(SESSION_FONT_TABS_PREVIEW_KEY);
      if (raw) {
        const p = JSON.parse(raw) as unknown;
        if (
          Array.isArray(p) &&
          p.length > 0 &&
          p.every(
            (x) =>
              x &&
              typeof (x as { id?: string }).id === 'string' &&
              (typeof (x as { label?: string }).label === 'string' ||
                typeof (x as { name?: string }).name === 'string'),
          )
        ) {
          setTabStripPreviewFromCache(
            p.map((x) => {
              const row = x as { id: string; label?: string; name?: string };
              return { id: row.id, label: (row.label || row.name || 'Шрифт').slice(0, 120) };
            }),
          );
        }
      }
    } catch {
      /* ignore */
    }

    const shell = readEditorShellFromStorage();
    const catalogEditorDeepLink =
      typeof window !== 'undefined' && hasCatalogEditorDeepLinkInSearch(window.location.search);
    if (shell) {
      editorShellDbg('layout#1: readEditorShellFromStorage', {
        mainTab: shell.mainTab,
        emptySlotCount: Array.isArray(shell.emptySlotIds) ? shell.emptySlotIds.length : 0,
        catalogEditorDeepLink,
      });
      setEmptySlotIds(shell.emptySlotIds);
      if (catalogEditorDeepLink) {
        previewTextDbg('shell: deep link openGoogle/openFontsource — mainTab pending, без вкладки «каталог»', {});
        setMainTab(EDITOR_MAIN_TAB_PENDING);
      } else {
        previewTextDbg('shell: восстановление mainTab из localStorage (до этого per-font snapshot мог ждать)', {
          mainTab: shell.mainTab,
        });
        setMainTab(shell.mainTab);
      }
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
        const parsed = JSON.parse(rawClosed) as unknown;
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every((id) => typeof id === 'string' && id.length > 0)
        ) {
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
        setFontsLibraryTab('catalog');
      }
    } catch {
      /* ignore */
    }

    try {
      const rawOrder = localStorage.getItem(SESSION_FONT_ORDER_LS_KEY);
      const parsed = rawOrder ? (JSON.parse(rawOrder) as unknown) : [];
      if (Array.isArray(parsed)) {
        initialSessionFontOrderIdsRef.current = parsed.filter((id): id is string => typeof id === 'string');
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

  useIsomorphicLayoutEffect(() => {
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
      window.localStorage.setItem(
        EDITOR_CLOSED_LIBRARY_FONT_IDS_LS_KEY,
        JSON.stringify(closedLibraryFontIds),
      );
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
