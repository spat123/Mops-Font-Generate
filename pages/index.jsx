import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import FontPreview from '../components/FontPreview';
import ExportModal from '../components/ExportModal';
import GenerateFontModal from '../components/GenerateFontModal';
import { toast } from '../utils/appNotify';
import { useFontContext } from '../contexts/FontContext';
import { useSettings, getDefaultPreviewSettingsSnapshot } from '../contexts/SettingsContext';
import GoogleFontsCatalogPanel from '../components/GoogleFontsCatalogPanel';
import FontsourceCatalogPanel from '../components/FontsourceCatalogPanel';
import { getFormatFromExtension, sessionFontCardPreviewStyle } from '../utils/fontUtilsCommon';
import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from '../utils/googleFontLoader';
import {
  buildGoogleFontGlyphSampleText,
  hasGoogleScriptGlyphSample,
} from '../utils/googleFontCatalogSampleText';
import { UnderlineTab } from '../components/ui/UnderlineTab';
import { SortableFontCardGrid } from '../components/ui/SortableFontCardGrid';
import { Tooltip } from '../components/ui/Tooltip';
import { EditorTabBar, EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ScopeFilterToolbar } from '../components/ui/ScopeFilterToolbar';
import { UploadFromDiskCard } from '../components/ui/UploadFromDiskCard';
import { EditorStatusBar } from '../components/ui/EditorStatusBar';
import { CatalogDownloadSplitButton } from '../components/ui/CatalogDownloadSplitButton';
import { updateFontSettings } from '../utils/db';
import { useFontLibraries } from '../hooks/useFontLibraries';
import { areIdOrdersEqual, moveItemById, orderItemsByIdList } from '../utils/arrayOrder';
import { getLibrarySourceLabel, normalizeLibraryText, sanitizeLibraryFont } from '../utils/fontLibraryUtils';
import {
  collectPerFontPreviewSnapshot,
  applyPerFontPreviewSnapshot,
} from '../utils/perFontPreviewSettings';
import { revokeObjectURL } from '../utils/localFontProcessor';
import { preloadFontsourcePreviewSlugs } from '../utils/fontsourcePreviewRuntimeCache';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';
import { readFontsourceCatalogCache } from '../utils/fontsourceCatalogCache';
import { formatCatalogAvailabilityShort, getCatalogUnionStats } from '../utils/catalogUnionStats';
import {
  notifyFontAlreadyInLibrary,
  notifyFontMovedToLibrary,
} from '../components/ui/FontLibraryToastNotifications';
import { readLibraryFontDragData } from '../utils/libraryDragData';
import { LibraryReorderHint } from '../components/ui/LibraryReorderHint';
import {
  prefetchFontsourceLibraryFontEntry,
  prefetchGoogleLibraryFontEntry,
} from '../utils/catalogLibraryBackgroundPrefetch';
import { buildSavedLibraryDownloadSplitButtonProps } from '../utils/savedLibraryFontDownload';
import { OpenExternalIcon, ShareIcon, TrashIcon } from '../components/ui/CommonIcons';

function isFontTabId(tab) {
  return typeof tab === 'string' && tab !== 'library' && !tab.startsWith(EMPTY_PREFIX);
}

/** После F5 восстанавливаем активную вкладку редактора (иначе остаётся «Новый» и сбрасывается выбор). */
const EDITOR_MAIN_TAB_LS_KEY = 'editorMainTab';

/** Список id слотов «Новый» (пустой массив = все закрыты, не создаём фиктивную вкладку). */
const EDITOR_EMPTY_SLOTS_LS_KEY = 'editorEmptySlots';

/** Вкладки шрифтов из библиотеки, закрытые крестиком (остаются в сессии, но скрыты в полосе) — восстановление после F5. */
const EDITOR_CLOSED_LIBRARY_FONT_IDS_LS_KEY = 'editorClosedLibraryFontTabIds';

/** Внутри экрана «Все шрифты»: активная внутренняя вкладка каталога или библиотеки. */
const FONTS_LIBRARY_INNER_TAB_LS_KEY = 'fontsLibraryInnerTab';
const SAVED_LIBRARY_TAB_PREFIX = 'saved-library:';
const SESSION_FONT_ORDER_LS_KEY = 'mopsSessionFontOrder';

/** Лёгкий снимок вкладок шрифтов для первого кадра после F5 (пока IndexedDB не отдал blobs). */
const SESSION_FONT_TABS_PREVIEW_KEY = 'mopsSessionFontTabsPreview';

/** До useLayoutEffect не подсвечиваем «Все шрифты» / не показываем контент — убирает мигание для новых пользователей. */
const EDITOR_MAIN_TAB_PENDING = '__editorShellPending__';

/** Синхронное восстановление до paint: без лишней вкладки «Новый» и без выбора её вместо сохранённой вкладки. */
function readEditorShellFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const rawSlots = localStorage.getItem(EDITOR_EMPTY_SLOTS_LS_KEY);
    const savedMain = localStorage.getItem(EDITOR_MAIN_TAB_LS_KEY);

    let emptySlotIds;
    if (rawSlots !== null) {
      const p = JSON.parse(rawSlots);
      emptySlotIds = Array.isArray(p) ? p.filter((x) => typeof x === 'string' && x.length > 0) : [];
    } else if (!savedMain) {
      emptySlotIds = [newEmptySlotId()];
    } else if (savedMain.startsWith(EMPTY_PREFIX)) {
      emptySlotIds = [savedMain.slice(EMPTY_PREFIX.length)];
    } else {
      emptySlotIds = [];
    }

    let mainTabResolved = 'library';
    if (savedMain === 'library') {
      mainTabResolved = 'library';
    } else if (savedMain?.startsWith(EMPTY_PREFIX)) {
      const sid = savedMain.slice(EMPTY_PREFIX.length);
      if (emptySlotIds.includes(sid)) {
        mainTabResolved = savedMain;
      } else {
        mainTabResolved = emptySlotIds.length > 0 ? `${EMPTY_PREFIX}${emptySlotIds[0]}` : 'library';
      }
    } else if (savedMain && savedMain !== 'library') {
      mainTabResolved = savedMain;
    } else if (!savedMain && emptySlotIds.length > 0) {
      mainTabResolved = `${EMPTY_PREFIX}${emptySlotIds[0]}`;
    }

    return { emptySlotIds, mainTab: mainTabResolved };
  } catch {
    const id = newEmptySlotId();
    return { emptySlotIds: [id], mainTab: `${EMPTY_PREFIX}${id}` };
  }
}

/** Вкладки внутри экрана «Все шрифты»: единый каталог + пользовательские библиотеки */
const LIBRARY_MAIN_TABS = [{ id: 'catalog', label: 'Каталог' }];

function makeSavedLibraryTabId(libraryId) {
  return `${SAVED_LIBRARY_TAB_PREFIX}${libraryId}`;
}

function readSavedLibraryId(tabId) {
  return typeof tabId === 'string' && tabId.startsWith(SAVED_LIBRARY_TAB_PREFIX)
    ? tabId.slice(SAVED_LIBRARY_TAB_PREFIX.length)
    : null;
}

const CATALOG_SOURCE_OPTIONS = [
  { value: 'google', label: 'Google' },
  { value: 'fontsource', label: 'Fontsource' },
];

const LIBRARY_FONT_SCOPE_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'local', label: 'С диска' },
  { id: 'google', label: 'Google' },
  { id: 'fontsource', label: 'Fontsource' },
];

const FONTSOURCE_PREWARM_LIMIT = 24;
const FONTSOURCE_PREWARM_CONCURRENCY = 2;
const FONTSOURCE_PREWARM_DELAY_MS = 1200;

function countFontsByScope(fonts) {
  const list = Array.isArray(fonts) ? fonts : [];
  return {
    all: list.length,
    local: list.filter((font) => (font?.source || 'local') === 'local').length,
    google: list.filter((font) => font?.source === 'google').length,
    fontsource: list.filter((font) => font?.source === 'fontsource').length,
  };
}

function buildScopeSelectOptions(counts) {
  return LIBRARY_FONT_SCOPE_TABS.map((tab) => ({
    value: tab.id,
    label: (
      <span className="flex w-full items-center justify-between gap-3">
        <span className="truncate">{tab.label}</span>
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-50 text-[10px] tabular-nums leading-none text-gray-800 transition-colors group-hover:bg-white group-hover:text-accent">
          {counts?.[tab.id] ?? 0}
        </span>
      </span>
    ),
    triggerLabel: tab.label,
  }));
}

function newEmptySlotId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Home() {
  // Получаем настройки из контекста
  const { 
    text, setText, 
    fontSize, setFontSize, 
    glyphsFontSize, setGlyphsFontSize,
    stylesFontSize, setStylesFontSize,
    lineHeight, setLineHeight, 
    letterSpacing, setLetterSpacing, 
    stylesLetterSpacing, setStylesLetterSpacing,
    textColor, setTextColor, 
    backgroundColor, setBackgroundColor, 
    viewMode, setViewMode,
    textDirection, setTextDirection, 
    textAlignment, setTextAlignment, 
    textCase, setTextCase,
    textDecoration,
    setTextDecoration,
    listStyle,
    setListStyle,
    textColumns,
    setTextColumns,
    textColumnGap,
    setTextColumnGap,
    waterfallRows,
    setWaterfallRows,
    waterfallBaseSize,
    setWaterfallBaseSize,
    waterfallEditTarget,
    setWaterfallEditTarget,
    waterfallHeadingPresetName,
    setWaterfallHeadingPresetName,
    waterfallBodyPresetName,
    setWaterfallBodyPresetName,
    waterfallHeadingLineHeight,
    setWaterfallHeadingLineHeight,
    waterfallBodyLineHeight,
    setWaterfallBodyLineHeight,
    waterfallHeadingLetterSpacing,
    setWaterfallHeadingLetterSpacing,
    waterfallBodyLetterSpacing,
    setWaterfallBodyLetterSpacing,
    waterfallScaleRatio,
    setWaterfallScaleRatio,
    waterfallUnit,
    setWaterfallUnit,
    waterfallRoundPx,
    setWaterfallRoundPx,
    setTextCenter,
    verticalAlignment,
    setVerticalAlignment,
    textFill,
    setTextFill,
  } = useSettings();
  
  
  // Оставляем состояния, которые не были перенесены
  const [isAnimating, setIsAnimating] = useState(false);
  const [cssString, setCssString] = useState('');
  /** Пустые слоты «Новый» — после mount подставляются из localStorage (может быть []). */
  const [emptySlotIds, setEmptySlotIds] = useState([]);
  /** До чтения shell в useLayoutEffect — EDITOR_MAIN_TAB_PENDING (не «Все шрифты»). */
  const [mainTab, setMainTab] = useState(EDITOR_MAIN_TAB_PENDING);
  /** Подвкладка внутри «Все шрифты»: каталог | пользовательская библиотека */
  const [fontsLibraryTab, setFontsLibraryTab] = useState('catalog');
  /** Источник внутри вкладки «Все» */
  const [catalogSource, setCatalogSource] = useState('google');
  /** Размер каталога для нижней полосы (обновляют панели каталога). */
  const [googleCatalogTotalItems, setGoogleCatalogTotalItems] = useState(0);
  const [fontsourceCatalogTotalItems, setFontsourceCatalogTotalItems] = useState(0);
  /** Подписи вкладок из прошлого визита — показываем до прихода fonts из IndexedDB (без «мигания»). */
  const [tabStripPreviewFromCache, setTabStripPreviewFromCache] = useState([]);
  const [closedLibraryFontIds, setClosedLibraryFontIds] = useState([]);
  const [savedLibraryFontsScope, setSavedLibraryFontsScope] = useState('all');
  const [fileUploadTarget, setFileUploadTarget] = useState('editor');
  const [createLibrarySeedRequest, setCreateLibrarySeedRequest] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [plainPreviewOpen, setPlainPreviewOpen] = useState(false);
  const [catalogSelectionActions, setCatalogSelectionActions] = useState({
    selectedCount: 0,
    downloadSelected: null,
    downloadSelectedAsFormat: null,
  });
  const [catalogPreviewSlotsById, setCatalogPreviewSlotsById] = useState({});
  const [libraryDropTargetTabId, setLibraryDropTargetTabId] = useState(null);
  const {
    libraries: fontLibraries,
    createLibrary: createFontLibrary,
    updateLibrary: updateFontLibrary,
    deleteLibrary: deleteFontLibrary,
    reorderLibraries: reorderFontLibraries,
    reorderLibraryFonts,
  } = useFontLibraries();

  // Используем хук useFontContext вместо useFontManager
  const {
    fonts,
    selectedFont,
    variableSettings,
    handleFontsUploaded,
    handleVariableSettingsChange,
    safeSelectFont,
    removeFont,
    setSelectedFont,
    availableStyles,
    selectedPresetName,
    applyPresetStyle,
    selectOrAddFontsourceFont,
    getFontFamily,
    getVariationSettings,
    resetVariableSettings,
    getVariableAxes,
    fontCssProperties,
    setFonts,
    isInitialLoadComplete,
    generateStaticFontFile,
    downloadFile,
  } = useFontContext();

  // Добавляем ref для input загрузки файлов
  const fileInputRef = useRef(null);

  const fontsRef = useRef(fonts);
  fontsRef.current = fonts;

  const previewSettingsValuesRef = useRef({});
  previewSettingsValuesRef.current = {
    text,
    fontSize,
    glyphsFontSize,
    stylesFontSize,
    lineHeight,
    letterSpacing,
    stylesLetterSpacing,
    textColor,
    backgroundColor,
    viewMode,
    textDirection,
    textAlignment,
    textCase,
    textDecoration,
    listStyle,
    textColumns,
    textColumnGap,
    waterfallRows,
    waterfallBaseSize,
    waterfallEditTarget,
    waterfallHeadingPresetName,
    waterfallBodyPresetName,
    waterfallHeadingLineHeight,
    waterfallBodyLineHeight,
    waterfallHeadingLetterSpacing,
    waterfallBodyLetterSpacing,
    waterfallScaleRatio,
    waterfallUnit,
    waterfallRoundPx,
    verticalAlignment,
    textFill,
  };

  const previewSettersRef = useRef({});
  previewSettersRef.current = {
    setText,
    setFontSize,
    setGlyphsFontSize,
    setStylesFontSize,
    setLineHeight,
    setLetterSpacing,
    setStylesLetterSpacing,
    setTextColor,
    setBackgroundColor,
    setViewMode,
    setTextDirection,
    setTextAlignment,
    setTextCase,
    setTextDecoration,
    setListStyle,
    setTextColumns,
    setTextColumnGap,
    setWaterfallRows,
    setWaterfallBaseSize,
    setWaterfallEditTarget,
    setWaterfallHeadingPresetName,
    setWaterfallBodyPresetName,
    setWaterfallHeadingLineHeight,
    setWaterfallBodyLineHeight,
    setWaterfallHeadingLetterSpacing,
    setWaterfallBodyLetterSpacing,
    setWaterfallScaleRatio,
    setWaterfallUnit,
    setWaterfallRoundPx,
    setTextCenter,
    setVerticalAlignment,
    setTextFill,
  };

  const lastMainTabForPreviewRef = useRef(null);
  const catalogPreviewSlotsByIdRef = useRef(catalogPreviewSlotsById);
  catalogPreviewSlotsByIdRef.current = catalogPreviewSlotsById;
  const initialSessionFontOrderIdsRef = useRef([]);
  const hasAppliedInitialSessionFontOrderRef = useRef(false);
  const hasStartedFontsourcePreviewPrewarmRef = useRef(false);

  /** После чтения shell из LS — можно безопасно писать mainTab и emptySlotIds обратно. */
  const [hasRestoredEditorMainTab, setHasRestoredEditorMainTab] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(SESSION_FONT_TABS_PREVIEW_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (
          Array.isArray(p) &&
          p.length > 0 &&
          p.every(
            (x) => x && typeof x.id === 'string' && (typeof x.label === 'string' || typeof x.name === 'string'),
          )
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
      setEmptySlotIds(shell.emptySlotIds);
      setMainTab(shell.mainTab);
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
    try {
      document.documentElement.dataset.editorUiReady = '1';
    } catch {
      /* ignore */
    }
    setHasRestoredEditorMainTab(true);
  }, []);

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

  useEffect(() => {
    if (fontsLibraryTab === 'catalog') return;
    const libraryId = readSavedLibraryId(fontsLibraryTab);
    if (!libraryId || !fontLibraries.some((library) => library.id === libraryId)) {
      setFontsLibraryTab('catalog');
    }
  }, [fontLibraries, fontsLibraryTab]);

  useEffect(() => {
    if (!isInitialLoadComplete || hasAppliedInitialSessionFontOrderRef.current) return;
    if (fonts.length === 0) {
      hasAppliedInitialSessionFontOrderRef.current = true;
      return;
    }
    const savedOrder = initialSessionFontOrderIdsRef.current;
    if (savedOrder.length > 0) {
      const orderedFonts = orderItemsByIdList(fonts, savedOrder);
      if (!areIdOrdersEqual(fonts, orderedFonts.map((font) => font.id))) {
        setFonts(orderedFonts);
      }
    }
    hasAppliedInitialSessionFontOrderRef.current = true;
  }, [fonts, isInitialLoadComplete, setFonts]);

  useEffect(() => {
    if (!isInitialLoadComplete || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SESSION_FONT_ORDER_LS_KEY, JSON.stringify(fonts.map((font) => font.id)));
    } catch {
      /* ignore */
    }
  }, [fonts, isInitialLoadComplete]);

  /** Фоновый prewarm превью Fontsource (даже до открытия вкладки Fontsource). */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!hasRestoredEditorMainTab) return undefined;
    if (hasStartedFontsourcePreviewPrewarmRef.current) return undefined;
    hasStartedFontsourcePreviewPrewarmRef.current = true;

    let cancelled = false;
    let idleHandle = null;
    let timeoutHandle = null;

    const runPrewarm = async () => {
      if (cancelled) return;

      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const saveData = Boolean(connection?.saveData);
      const effectiveType = String(connection?.effectiveType || '').toLowerCase();
      if (saveData || effectiveType === '2g' || effectiveType === 'slow-2g') {
        return;
      }

      try {
        const catalogRes = await fetch('/api/fontsource-catalog');
        if (!catalogRes.ok) return;
        const catalogData = await catalogRes.json();
        const slugs = (Array.isArray(catalogData?.items) ? catalogData.items : [])
          .map((row) => row?.id || row?.slug)
          .filter(Boolean)
          .slice(0, FONTSOURCE_PREWARM_LIMIT);

        if (slugs.length === 0) return;

        await preloadFontsourcePreviewSlugs(slugs, {
          concurrency: FONTSOURCE_PREWARM_CONCURRENCY,
          weight: 400,
          style: 'normal',
          subset: 'latin',
        });
      } catch (e) {
        // Игнорируем: prewarm необязателен
      }
    };

    const start = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idleHandle = window.requestIdleCallback(() => {
          runPrewarm();
        }, { timeout: 4000 });
      } else {
        timeoutHandle = window.setTimeout(() => {
          runPrewarm();
        }, FONTSOURCE_PREWARM_DELAY_MS);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [hasRestoredEditorMainTab]);

  /** Настройки левой панели / превью — отдельно на каждую вкладку шрифта */
  useEffect(() => {
    const prevTab = lastMainTabForPreviewRef.current;
    const nextTab = mainTab;

    if (nextTab === EDITOR_MAIN_TAB_PENDING) {
      lastMainTabForPreviewRef.current = nextTab;
      return;
    }

    if (prevTab !== null && prevTab !== nextTab && isFontTabId(prevTab)) {
      const snap = collectPerFontPreviewSnapshot(previewSettingsValuesRef.current);
      setFonts((fs) =>
        fs.map((f) => (f.id === prevTab ? { ...f, previewSettings: { ...snap } } : f)),
      );
      updateFontSettings(prevTab, { previewSettings: snap }).catch(() => {});
    }

    if (isFontTabId(nextTab)) {
      const font = fontsRef.current.find((f) => f.id === nextTab);
      if (font?.previewSettings) {
        applyPerFontPreviewSnapshot(font.previewSettings, previewSettersRef.current);
      } else {
        applyPerFontPreviewSnapshot(getDefaultPreviewSettingsSnapshot(), previewSettersRef.current);
      }
    } else if (nextTab === 'library' || nextTab.startsWith(EMPTY_PREFIX)) {
      applyPerFontPreviewSnapshot(getDefaultPreviewSettingsSnapshot(), previewSettersRef.current);
    }

    lastMainTabForPreviewRef.current = nextTab;
  }, [mainTab, setFonts]);

  /** Sidebar должен соответствовать активной вкладке: на «Все шрифты»/«Новый» — дефолт, на вкладке шрифта — выбранный. */
  const sidebarSelectedFont = useMemo(
    () => {
      if (isFontTabId(mainTab)) return selectedFont;
      if (mainTab.startsWith(EMPTY_PREFIX)) {
        const slotId = mainTab.slice(EMPTY_PREFIX.length);
        const slotFont = catalogPreviewSlotsById?.[slotId] || null;
        if (!slotFont) return null;
        // Для preview-вкладки используем «живой» selectedFont, если это тот же шрифт:
        // иначе Roman/Italic меняется в логике, но визуально остаётся старый снимок из slot map.
        if (selectedFont?.id && selectedFont.id === slotFont.id) return selectedFont;
        return slotFont;
      }
      return null;
    },
    [mainTab, selectedFont, catalogPreviewSlotsById],
  );

  const releaseCatalogPreviewFont = useCallback((font) => {
    if (!font || typeof font.url !== 'string') return;
    revokeObjectURL(font.url);
  }, []);

  useEffect(() => {
    return () => {
      const slots = catalogPreviewSlotsByIdRef.current || {};
      Object.values(slots).forEach((font) => releaseCatalogPreviewFont(font));
    };
  }, [releaseCatalogPreviewFont]);

  useEffect(() => {
    const liveSlotIds = new Set(emptySlotIds);
    setCatalogPreviewSlotsById((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      keys.forEach((slotId) => {
        if (liveSlotIds.has(slotId)) return;
        changed = true;
        releaseCatalogPreviewFont(next[slotId]);
        delete next[slotId];
      });
      return changed ? next : prev;
    });
  }, [emptySlotIds, releaseCatalogPreviewFont]);

  /** После merge previewSettings в массиве fonts — обновить ссылку selectedFont */
  useEffect(() => {
    if (!selectedFont?.id) return;
    const fresh = fonts.find((f) => f.id === selectedFont.id);
    if (fresh && fresh !== selectedFont) {
      setSelectedFont(fresh);
    }
  }, [fonts, selectedFont, setSelectedFont]);

  const libraryTabs = useMemo(
    () => [
      ...LIBRARY_MAIN_TABS,
      ...fontLibraries.map((library) => ({
        id: makeSavedLibraryTabId(library.id),
        label: library.name,
      })),
    ],
    [fontLibraries],
  );

  const activeSavedLibrary = useMemo(() => {
    const libraryId = readSavedLibraryId(fontsLibraryTab);
    if (!libraryId) return null;
    return fontLibraries.find((library) => library.id === libraryId) || null;
  }, [fontLibraries, fontsLibraryTab]);

  const filteredActiveSavedLibraryFonts = useMemo(() => {
    if (!activeSavedLibrary) return [];
    if (savedLibraryFontsScope === 'all') return activeSavedLibrary.fonts;
    return activeSavedLibrary.fonts.filter((font) => (font?.source || 'editor') === savedLibraryFontsScope);
  }, [activeSavedLibrary, savedLibraryFontsScope]);

  const activeSavedLibraryScopeCounts = useMemo(
    () => countFontsByScope(activeSavedLibrary?.fonts || []),
    [activeSavedLibrary],
  );
  const activeSavedLibraryScopeOptions = useMemo(
    () => buildScopeSelectOptions(activeSavedLibraryScopeCounts),
    [activeSavedLibraryScopeCounts],
  );

  const libraryFontEntryKeys = useMemo(() => {
    const keys = new Set();
    fontLibraries.forEach((library) => {
      (Array.isArray(library?.fonts) ? library.fonts : []).forEach((entry) => {
        const entryId = String(entry?.id || '').trim();
        const entrySource = String(entry?.source || 'editor').trim();
        const entryLabel = normalizeLibraryText(entry?.label || '').toLowerCase();
        if (entryId) keys.add(entryId);
        if (entrySource && entryLabel) keys.add(`${entrySource}:${entryLabel}`);
      });
    });
    return keys;
  }, [fontLibraries]);

  const isFontStoredInAnyLibrary = useCallback(
    (font) => {
      if (!font) return false;
      const label = normalizeLibraryText(font.displayName || font.name || '').toLowerCase();
      const source = String(font.source || 'editor').trim();
      const candidates = [];
      if (font?.id) candidates.push(`session:${String(font.id).trim()}`);
      if (font?.source === 'google' && label) candidates.push(`google:${label}`);
      if (font?.source === 'fontsource' && font?.name) {
        candidates.push(`fontsource:${normalizeLibraryText(font.name).toLowerCase()}`);
      }
      if (source && label) candidates.push(`${source}:${label}`);
      return candidates.some((key) => libraryFontEntryKeys.has(key));
    },
    [libraryFontEntryKeys],
  );

  const sessionFontLookup = useMemo(() => {
    const byLabel = new Map();
    const byLibraryEntryId = new Map();
    fonts.forEach((font) => {
      const keys = [font.displayName, font.name].filter(Boolean);
      keys.forEach((key) => {
        byLabel.set(String(key).toLowerCase(), font);
      });
      if (font?.source === 'fontsource' && font?.name) {
        byLibraryEntryId.set(`fontsource:${String(font.name).trim()}`, font);
      } else if (font?.source === 'google') {
        const family = String(font.displayName || font.name || '').trim();
        if (family) {
          byLibraryEntryId.set(`google:${family}`, font);
        }
      } else if (font?.id) {
        byLibraryEntryId.set(`session:${String(font.id).trim()}`, font);
      }
    });
    return { byLabel, byLibraryEntryId };
  }, [fonts]);

  /** Пока IndexedDB не отдал шрифты — рисуем «заглушки» вкладок из sessionStorage (последний визит). */
  const fontTabPlaceholders = useMemo(() => {
    if (fonts.length > 0) return null;
    if (isInitialLoadComplete) return null;
    if (!tabStripPreviewFromCache.length) return null;
    return tabStripPreviewFromCache;
  }, [fonts.length, isInitialLoadComplete, tabStripPreviewFromCache]);

  const emptySlotLabelsById = useMemo(() => {
    const out = {};
    Object.entries(catalogPreviewSlotsById || {}).forEach(([slotId, font]) => {
      const label = font?.displayName || font?.name || '';
      if (label) out[slotId] = String(label);
    });
    return out;
  }, [catalogPreviewSlotsById]);

  const fontsVisibleInTabBar = useMemo(
    () => fonts.filter((font) => !closedLibraryFontIds.includes(font.id)),
    [fonts, closedLibraryFontIds],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialLoadComplete) return;
    if (fontsVisibleInTabBar.length === 0) {
      try {
        sessionStorage.removeItem(SESSION_FONT_TABS_PREVIEW_KEY);
      } catch {
        /* ignore */
      }
      setTabStripPreviewFromCache([]);
    }
    if (fontsVisibleInTabBar.length > 0) {
      try {
        const snapshot = fontsVisibleInTabBar.map((f) => ({
          id: f.id,
          label: (f.displayName || f.name || 'Шрифт').slice(0, 120),
        }));
        sessionStorage.setItem(SESSION_FONT_TABS_PREVIEW_KEY, JSON.stringify(snapshot));
      } catch {
        /* ignore */
      }
    }
  }, [fontsVisibleInTabBar, isInitialLoadComplete]);

  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const fontsById = new Map(fonts.map((font) => [font.id, font]));
    setClosedLibraryFontIds((prev) =>
      prev.filter((fontId) => {
        const font = fontsById.get(fontId);
        return Boolean(font) && isFontStoredInAnyLibrary(font);
      }),
    );
  }, [fonts, isFontStoredInAnyLibrary, isInitialLoadComplete]);

  const sessionCardPreviewStyleFor = useCallback((font) => {
    if (font.source === 'google') {
      const family = font.displayName || font.name;
      return { fontFamily: `'${family}', sans-serif`, fontSize: '20px' };
    }
    return sessionFontCardPreviewStyle(font);
  }, []);

  const handleFontsUploadedWithNav = useCallback(
    async (newFonts, options = {}) => {
      const { noSelect = false } = options;
      const fromEmptySlot = mainTab.startsWith(EMPTY_PREFIX) ? mainTab.slice(EMPTY_PREFIX.length) : null;
      const added = await handleFontsUploaded(newFonts, options);
      const first = Array.isArray(newFonts) && newFonts[0];
      const src = first?.source;
      if (!noSelect && added?.id) {
        if (fromEmptySlot) {
          setEmptySlotIds((ids) => ids.filter((x) => x !== fromEmptySlot));
        }
        setMainTab(added.id);
      }
      if (src === 'google') {
        setFontsLibraryTab('catalog');
        setCatalogSource('google');
      } else if (src === 'fontsource') {
        setFontsLibraryTab('catalog');
        setCatalogSource('fontsource');
      }
      return added || null;
    },
    [handleFontsUploaded, mainTab],
  );

  const selectOrAddFontsourceFontWithNav = useCallback(
    async (fontFamilyName, forceVariableFont = false, options = {}) => {
      const { noSelect = false } = options;
      const fromEmptySlot = mainTab.startsWith(EMPTY_PREFIX) ? mainTab.slice(EMPTY_PREFIX.length) : null;
      const added = await selectOrAddFontsourceFont(fontFamilyName, forceVariableFont, options);
      if (!noSelect && added?.id) {
        if (fromEmptySlot) {
          setEmptySlotIds((ids) => ids.filter((x) => x !== fromEmptySlot));
        }
        setMainTab(added.id);
      }
      setFontsLibraryTab('catalog');
      setCatalogSource('fontsource');
      return added || null;
    },
    [selectOrAddFontsourceFont, mainTab],
  );

  /** «Открыть» в каталоге: скачать в сессию редактора и перейти на вкладку шрифта. */
  const openGoogleCatalogEntryInEditorTab = useCallback(
    async (catalogEntry) => {
      if (!catalogEntry?.family) return;
      const family = catalogEntry.family;
      try {
        const subsetList = Array.isArray(catalogEntry.subsets) ? catalogEntry.subsets : [];
        const googleFontRecommendedSample = hasGoogleScriptGlyphSample(catalogEntry)
          ? buildGoogleFontGlyphSampleText(catalogEntry)
          : undefined;
        const useVariable = catalogEntry.isVariable === true;
        const slices = useVariable
          ? await fetchGoogleVariableFontSlicesAll(family, {
              subsets: subsetList,
              ...(catalogEntry.wghtMin != null && catalogEntry.wghtMax != null
                ? { wghtMin: catalogEntry.wghtMin, wghtMax: catalogEntry.wghtMax }
                : {}),
            })
          : await fetchGoogleStaticFontSlicesAll(family, {
              weight: 400,
              italic: false,
              subsets: subsetList,
            });
        if (!slices?.[0]?.blob?.size) throw new Error('Пустой файл');
        await handleFontsUploadedWithNav(
          [
            {
              file: slices[0].blob,
              name: `${family}.woff2`,
              source: 'google',
              googleFontSlices: slices,
              googleFontAxesFromCatalog:
                Array.isArray(catalogEntry.axes) && catalogEntry.axes.length > 0 ? catalogEntry.axes : null,
              googleFontItalicMode:
                typeof catalogEntry.italicMode === 'string' && catalogEntry.italicMode
                  ? catalogEntry.italicMode
                  : 'none',
              googleFontHasItalicStyles: catalogEntry.hasItalicStyles === true,
              googleFontRecommendedSample,
            },
          ],
          { silent: true },
        );
      } catch {
        toast.error(`Не удалось открыть ${family}`);
      }
    },
    [handleFontsUploadedWithNav],
  );

  const openFontsourceSlugInEditorTab = useCallback(
    (slug, isVariable) => selectOrAddFontsourceFontWithNav(slug, Boolean(isVariable), { silent: true }),
    [selectOrAddFontsourceFontWithNav],
  );

  const openLibraryFontEntry = useCallback(
    async (fontEntry) => {
      if (!fontEntry) return;
      const entryId = String(fontEntry.id || '').trim();
      const entryLabel = String(fontEntry.label || '').trim();
      const entrySource = String(fontEntry.source || 'editor').trim();
      const sessionFont =
        sessionFontLookup.byLibraryEntryId.get(entryId) ||
        sessionFontLookup.byLabel.get(entryLabel.toLowerCase()) ||
        null;

      if (sessionFont) {
        setClosedLibraryFontIds((prev) => prev.filter((id) => id !== sessionFont.id));
        safeSelectFont(sessionFont);
        setMainTab(sessionFont.id);
        return;
      }

      if (entrySource === 'fontsource') {
        const slug = entryId.startsWith('fontsource:') ? entryId.slice('fontsource:'.length) : '';
        if (!slug) {
          toast.info(`Не удалось определить пакет Fontsource для ${entryLabel || 'шрифта'}`);
          return;
        }
        await selectOrAddFontsourceFontWithNav(slug, false, { silent: true });
        return;
      }

      if (entrySource === 'google') {
        const family = entryLabel;
        const catalogEntry = readGoogleFontCatalogCache().find(
          (item) => String(item?.family || '').trim().toLowerCase() === family.toLowerCase(),
        );
        if (!catalogEntry) {
          toast.info(`Шрифт ${family} пока не найден в кэше Google Fonts`);
          return;
        }
        try {
          const subsetList = Array.isArray(catalogEntry.subsets) ? catalogEntry.subsets : [];
          const googleFontRecommendedSample = hasGoogleScriptGlyphSample(catalogEntry)
            ? buildGoogleFontGlyphSampleText(catalogEntry)
            : undefined;
          const useVariable = catalogEntry.isVariable === true;
          const slices = useVariable
            ? await fetchGoogleVariableFontSlicesAll(family, {
                subsets: subsetList,
                ...(catalogEntry.wghtMin != null && catalogEntry.wghtMax != null
                  ? { wghtMin: catalogEntry.wghtMin, wghtMax: catalogEntry.wghtMax }
                  : {}),
              })
            : await fetchGoogleStaticFontSlicesAll(family, {
                weight: 400,
                italic: false,
                subsets: subsetList,
              });
          if (!slices?.[0]?.blob?.size) throw new Error('Пустой файл');
          await handleFontsUploadedWithNav([
            {
              file: slices[0].blob,
              name: `${family}.woff2`,
              source: 'google',
              googleFontSlices: slices,
              googleFontAxesFromCatalog:
                Array.isArray(catalogEntry.axes) && catalogEntry.axes.length > 0 ? catalogEntry.axes : null,
              googleFontItalicMode:
                typeof catalogEntry.italicMode === 'string' && catalogEntry.italicMode ? catalogEntry.italicMode : 'none',
              googleFontHasItalicStyles: catalogEntry.hasItalicStyles === true,
              googleFontRecommendedSample,
            },
          ], { silent: true });
        } catch {
          toast.error(`Не удалось открыть ${family}`);
        }
        return;
      }

      if (entrySource === 'local' || entrySource === 'editor') {
        toast.info(`Шрифт ${entryLabel || 'без названия'} сейчас не загружен в редактор`);
      }
    },
    [
      handleFontsUploadedWithNav,
      safeSelectFont,
      selectOrAddFontsourceFontWithNav,
      sessionFontLookup,
    ],
  );

  /** Выбор шрифта с сайдбара: с подсветкой вкладки, если не открыт каталог */
  const pickFont = useCallback(
    (font) => {
      setClosedLibraryFontIds((prev) => prev.filter((id) => id !== font.id));
      safeSelectFont(font);
      setMainTab(font.id);
    },
    [safeSelectFont],
  );

  /** × на вкладке шрифта: библиотечные шрифты закрываем, временные удаляем из редактора. */
  const closeFontTab = useCallback(
    (fontId) => {
      const targetFont = fonts.find((font) => font.id === fontId) || null;
      const isStoredInLibrary = isFontStoredInAnyLibrary(targetFont);

      if (isStoredInLibrary) {
        const nextClosed = closedLibraryFontIds.includes(fontId)
          ? closedLibraryFontIds
          : [...closedLibraryFontIds, fontId];
        setClosedLibraryFontIds(nextClosed);
        if (mainTab === fontId) {
          const nextVisible =
            fonts.find((font) => font.id !== fontId && !nextClosed.includes(font.id)) || null;
          if (nextVisible) {
            setMainTab(nextVisible.id);
            safeSelectFont(nextVisible);
          } else if (emptySlotIds.length > 0) {
            setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
            setSelectedFont(null);
          } else {
            setMainTab('library');
            setSelectedFont(null);
          }
        }
        return;
      }

      const remainingFonts = fonts.filter((font) => font.id !== fontId);
      if (mainTab === fontId) {
        const nextVisible = remainingFonts.find((font) => !closedLibraryFontIds.includes(font.id)) || null;
        if (nextVisible) {
          setMainTab(nextVisible.id);
          safeSelectFont(nextVisible);
        } else if (emptySlotIds.length > 0) {
          setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
          setSelectedFont(null);
        } else {
          setMainTab('library');
          setSelectedFont(null);
        }
      } else if (selectedFont?.id === fontId) {
        setSelectedFont(remainingFonts[0] || null);
      }
      setClosedLibraryFontIds((prev) => prev.filter((id) => id !== fontId));
      removeFont(fontId);
    },
    [
      closedLibraryFontIds,
      emptySlotIds,
      fonts,
      isFontStoredInAnyLibrary,
      mainTab,
      removeFont,
      safeSelectFont,
      selectedFont,
      setSelectedFont,
    ],
  );

  /** Удалить шрифт из редактора с карточки библиотеки/списка. */
  const removeFontFromSession = useCallback(
    (fontId) => {
      const remainingFonts = fonts.filter((font) => font.id !== fontId);
      if (mainTab === fontId) {
        const nextVisible = remainingFonts[0] || null;
        if (nextVisible) {
          setMainTab(nextVisible.id);
          safeSelectFont(nextVisible);
          removeFont(fontId);
          return;
        }
        if (emptySlotIds.length > 0) {
          setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
          setSelectedFont(null);
          removeFont(fontId);
          return;
        }
        setMainTab('library');
        setSelectedFont(null);
      } else if (selectedFont?.id === fontId) {
        setSelectedFont(remainingFonts[0] || null);
      }
      removeFont(fontId);
    },
    [emptySlotIds, fonts, mainTab, removeFont, safeSelectFont, selectedFont, setSelectedFont],
  );

  const addEmptyPreviewSlot = useCallback(() => {
    const id = newEmptySlotId();
    setEmptySlotIds((s) => [...s, id]);
    setMainTab(`${EMPTY_PREFIX}${id}`);
    setSelectedFont(null);
  }, [setSelectedFont]);

  const handleRemoveEmptySlot = useCallback(
    (slotId) => {
      const tabKey = `${EMPTY_PREFIX}${slotId}`;
      setEmptySlotIds((ids) => ids.filter((x) => x !== slotId));
      setCatalogPreviewSlotsById((prev) => {
        if (!prev?.[slotId]) return prev;
        const next = { ...prev };
        releaseCatalogPreviewFont(next[slotId]);
        delete next[slotId];
        return next;
      });
      if (mainTab === tabKey) {
        setMainTab('library');
      }
    },
    [mainTab, releaseCatalogPreviewFont],
  );

  useEffect(() => {
    if (!isInitialLoadComplete) return;
    if (mainTab === EDITOR_MAIN_TAB_PENDING) return;
    if (mainTab === 'library' || mainTab.startsWith(EMPTY_PREFIX)) return;
    if (fonts.length === 0) return;
    const exists = fonts.some((f) => f.id === mainTab);
    if (!exists) {
      if (selectedFont?.id && fonts.some((f) => f.id === selectedFont.id)) {
        setClosedLibraryFontIds((prev) => prev.filter((id) => id !== selectedFont.id));
        setMainTab(selectedFont.id);
      } else {
        setMainTab('library');
      }
    }
  }, [isInitialLoadComplete, fonts, mainTab, selectedFont]);

  useEffect(() => {
    if (!mainTab.startsWith(EMPTY_PREFIX)) return;
    const slotId = mainTab.slice(EMPTY_PREFIX.length);
    if (!emptySlotIds.includes(slotId)) {
      setMainTab('library');
    }
  }, [mainTab, emptySlotIds]);

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  const sampleTexts = {
    glyph: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    title: 'The Quick Brown Fox Jumps Over The Lazy Dog',
    pangram: 'Pack my box with five dozen liquor jugs.',
    paragraph: 'Typography is the art and technique of arranging type to make written language legible, readable and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing.',
    wikipedia: 'In metal typesetting, a font was a particular size, weight and style of a typeface. Each font was a matched set of type, one piece for each glyph, and a typeface consisting of a range of fonts that shared an overall design.'
  };

  // Функция для обработки загрузки файлов через кнопку
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const fileItems = Array.from(files).map((file) => ({
        file,
        name: file.name,
      }));

      if (fileUploadTarget === 'library' && activeSavedLibrary) {
        const addedLibraryFonts = [];

        for (const item of fileItems) {
          const added = await handleFontsUploadedWithNav([item]);
          if (added) {
            addedLibraryFonts.push({
              id: `session:${added.id || added.name || added.displayName}`,
              label: added.displayName || added.name || item.name.replace(/\.[^/.]+$/, ''),
              source: added.source || 'local',
            });
          }
        }

        if (addedLibraryFonts.length > 0) {
          const existingIds = new Set((activeSavedLibrary.fonts || []).map((item) => item.id));
          handleUpdateSavedLibrary(activeSavedLibrary.id, {
            fonts: [
              ...activeSavedLibrary.fonts,
              ...addedLibraryFonts.filter((item) => !existingIds.has(item.id)),
            ],
          });
        }
      } else {
        await handleFontsUploadedWithNav(fileItems);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFileUploadTarget('editor');
    }
  };

  const buildExportCssCode = useCallback(() => {
    if (!selectedFont) return '';
    let cssCode = '';

    cssCode += `/* @font-face правило для загрузки шрифта */
@font-face {
  font-family: '${selectedFont.fontFamily || selectedFont.name}';
  src: url('${selectedFont.url || 'путь/к/вашему/шрифту.ttf'}') format('${getFormatFromExtension(selectedFont.name) || 'truetype'}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}\n\n`;

    if (selectedFont.isVariableFont && variableSettings && Object.keys(variableSettings).length > 0) {
      cssCode += `/* CSS переменные для вариативных осей */
:root {
${Object.entries(variableSettings).map(([tag, value]) => `  --font-${tag}: ${value};`).join('\n')}
}\n\n`;

      const variationSettingsStr = Object.entries(variableSettings)
        .map(([tag, value]) => `"${tag}" var(--font-${tag})`)
        .join(', ');

      cssCode += `/* Пример использования вариативного шрифта */
.your-element {
  font-family: '${selectedFont.fontFamily || selectedFont.name}', sans-serif;
  font-variation-settings: ${variationSettingsStr};
  font-size: ${fontSize}px;
  line-height: ${lineHeight};
  letter-spacing: ${(letterSpacing / 100) * 0.5}em;
  color: ${textColor || '#000000'};
  direction: ${textDirection};
  text-align: ${textAlignment};
  text-transform: ${textCase};
}\n\n`;

      cssCode += `/* Примеры предустановленных стилей на основе вариативных осей */
.font-light {
  font-variation-settings: "wght" 300;
}
.font-regular {
  font-variation-settings: "wght" 400;
}
.font-medium {
  font-variation-settings: "wght" 500;
}
.font-bold {
  font-variation-settings: "wght" 700;
}
`;
    } else {
      cssCode += `/* Пример использования шрифта */
.your-element {
  font-family: '${selectedFont.fontFamily || selectedFont.name}', sans-serif;
  font-size: ${fontSize}px;
  line-height: ${lineHeight};
  letter-spacing: ${(letterSpacing / 100) * 0.5}em;
  color: ${textColor || '#000000'};
  direction: ${textDirection};
  text-align: ${textAlignment};
  text-transform: ${textCase};
}\n`;
    }
    return cssCode;
  }, [
    selectedFont,
    variableSettings,
    fontSize,
    lineHeight,
    letterSpacing,
    textColor,
    textDirection,
    textAlignment,
    textCase,
  ]);

  const handleExportClick = useCallback(() => {
    if (!selectedFont) {
      toast.error('Сначала выберите шрифт');
      return;
    }
    setCssString(buildExportCssCode());
    setIsExportModalOpen(true);
  }, [selectedFont, buildExportCssCode]);

  const handleGenerateClick = useCallback(() => {
    if (!selectedFont) {
      toast.error('Сначала выберите шрифт');
      return;
    }
    if (!selectedFont.isVariableFont) {
      toast.info('Генерация файла доступна для вариативных шрифтов');
      return;
    }
    setIsGenerateModalOpen(true);
  }, [selectedFont]);

  const closePlainPreview = useCallback(() => setPlainPreviewOpen(false), []);

  const openSavedLibrary = useCallback((libraryId) => {
    setMainTab('library');
    setFontsLibraryTab(makeSavedLibraryTabId(libraryId));
  }, []);

  const handleCreateSavedLibrary = useCallback(
    (draft) => {
      const created = createFontLibrary(draft);
      if (created?.id) {
        setMainTab('library');
        setFontsLibraryTab(makeSavedLibraryTabId(created.id));
      }
      return created;
    },
    [createFontLibrary],
  );

  const handleUpdateSavedLibrary = useCallback(
    (libraryId, draft) => updateFontLibrary(libraryId, draft),
    [updateFontLibrary],
  );

  const handleDeleteSavedLibrary = useCallback(
    (libraryId) => {
      deleteFontLibrary(libraryId);
      setFontsLibraryTab((prev) => (prev === makeSavedLibraryTabId(libraryId) ? 'catalog' : prev));
    },
    [deleteFontLibrary],
  );

  const handleMoveLibraryFont = useCallback(
    (libraryId, draggedFontId, targetFontId) => {
      reorderLibraryFonts(libraryId, draggedFontId, targetFontId);
    },
    [reorderLibraryFonts],
  );

  const addFontEntryToLibrary = useCallback(
    (libraryId, fontEntry) => {
      const entry = sanitizeLibraryFont(fontEntry);
      if (!entry) return false;
      const targetLibrary = fontLibraries.find((library) => library.id === libraryId);
      if (!targetLibrary) return false;
      if (targetLibrary.fonts.some((item) => item.id === entry.id)) {
        notifyFontAlreadyInLibrary(entry.label, targetLibrary.name);
        return false;
      }
      handleUpdateSavedLibrary(libraryId, {
        fonts: [...targetLibrary.fonts, entry],
      });
      notifyFontMovedToLibrary(entry.label, targetLibrary.name);
      if (entry.source === 'google') {
        prefetchGoogleLibraryFontEntry(entry);
      } else if (entry.source === 'fontsource') {
        prefetchFontsourceLibraryFontEntry(entry);
      }
      return true;
    },
    [fontLibraries, handleUpdateSavedLibrary],
  );

  const handleLibraryTabDragOver = useCallback((event, tabId) => {
    const draggedFontEntry = readLibraryFontDragData(event.dataTransfer);
    if (!draggedFontEntry) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setLibraryDropTargetTabId(tabId);
  }, []);

  const handleLibraryTabDrop = useCallback(
    (event, tabId) => {
      const draggedFontEntry = readLibraryFontDragData(event.dataTransfer);
      if (!draggedFontEntry) return;
      event.preventDefault();
      const libraryId = readSavedLibraryId(tabId);
      if (libraryId) {
        addFontEntryToLibrary(libraryId, draggedFontEntry);
        setFontsLibraryTab(tabId);
      }
      setLibraryDropTargetTabId(null);
    },
    [addFontEntryToLibrary],
  );

  const moveFontEntryToLibrary = useCallback(
    (libraryId, fontEntry) => {
      const entry = sanitizeLibraryFont(fontEntry);
      if (!entry) return;
      const entryId = String(entry.id || '').trim();
      const entrySource = String(entry.source || '').trim();
      const entryLabel = normalizeLibraryText(entry.label || '').toLowerCase();
      const candidateIds = Array.isArray(fontEntry?.candidateIds)
        ? fontEntry.candidateIds.map((value) => String(value || '').trim()).filter(Boolean)
        : [];
      const candidateLabels = Array.isArray(fontEntry?.candidateLabels)
        ? fontEntry.candidateLabels
            .map((value) => normalizeLibraryText(value || '').toLowerCase())
            .filter(Boolean)
        : [];
      const matchesEntry = (item) => {
        const itemId = String(item?.id || '').trim();
        if (entryId && itemId === entryId) return true;
        if (candidateIds.includes(itemId)) return true;
        const itemSource = String(item?.source || '').trim();
        const itemLabel = normalizeLibraryText(item?.label || '').toLowerCase();
        if (entrySource && entryLabel && itemSource === entrySource && itemLabel === entryLabel) return true;
        if (
          entrySource &&
          candidateLabels.length > 0 &&
          itemSource === entrySource &&
          candidateLabels.includes(itemLabel)
        ) {
          return true;
        }
        return false;
      };
      const targetLibrary = fontLibraries.find((library) => library.id === libraryId);
      if (!targetLibrary) return;

      const currentlyIn = fontLibraries.filter(
        (library) => Array.isArray(library.fonts) && library.fonts.some(matchesEntry),
      );
      const canonicalEntry =
        currentlyIn
          .flatMap((library) => (Array.isArray(library.fonts) ? library.fonts : []))
          .find(matchesEntry) || entry;

      if (currentlyIn.length === 1 && currentlyIn[0].id === targetLibrary.id) {
        toast.info(`Шрифт «${canonicalEntry.label}» уже в библиотеке «${targetLibrary.name}»`);
        return;
      }

      fontLibraries.forEach((library) => {
        const fontsWithoutEntry = (Array.isArray(library.fonts) ? library.fonts : []).filter(
          (item) => !matchesEntry(item),
        );
        const nextFonts =
          library.id === targetLibrary.id ? [...fontsWithoutEntry, canonicalEntry] : fontsWithoutEntry;
        const hasChanged =
          nextFonts.length !== (library.fonts?.length || 0) ||
          nextFonts.some((item, index) => item.id !== (library.fonts?.[index]?.id || ''));
        if (hasChanged) {
          handleUpdateSavedLibrary(library.id, { fonts: nextFonts });
        }
      });

      toast.success(`Перенесен в «${targetLibrary.name}»`);
    },
    [fontLibraries, handleUpdateSavedLibrary],
  );

  const requestCreateLibraryWithFonts = useCallback((selectedFonts) => {
    setCreateLibrarySeedRequest({
      requestId:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `library-seed:${Date.now()}`,
      selectedFonts: (Array.isArray(selectedFonts) ? selectedFonts : []).filter(Boolean),
    });
  }, []);

  const handleCatalogSelectionActionsChange = useCallback((nextActions) => {
    if (!nextActions || typeof nextActions !== 'object') {
      setCatalogSelectionActions({
        selectedCount: 0,
        downloadSelected: null,
        downloadSelectedAsFormat: null,
      });
      return;
    }
    setCatalogSelectionActions({
      selectedCount: Number(nextActions.selectedCount) || 0,
      downloadSelected:
        typeof nextActions.downloadSelected === 'function' ? nextActions.downloadSelected : null,
      downloadSelectedAsFormat:
        typeof nextActions.downloadSelectedAsFormat === 'function'
          ? nextActions.downloadSelectedAsFormat
          : null,
    });
  }, []);

  const activeSavedLibraryItems = useMemo(() => {
    if (!activeSavedLibrary) return [];
    return filteredActiveSavedLibraryFonts.map((font) => {
      const sessionFont =
        sessionFontLookup.byLibraryEntryId.get(String(font.id || '').trim()) ||
        sessionFontLookup.byLabel.get(String(font.label || '').toLowerCase()) ||
        null;
      return {
        id: font.id,
        selected: sessionFont ? mainTab === sessionFont.id : false,
        title: font.label,
        subtitle: sessionFont
          ? `${getLibrarySourceLabel(font.source)} · Загружен`
          : getLibrarySourceLabel(font.source),
        previewStyle: sessionFont ? sessionCardPreviewStyleFor(sessionFont) : undefined,
        onCardClick: () => {
          void openLibraryFontEntry(font);
        },
        downloadSplitButtonProps: buildSavedLibraryDownloadSplitButtonProps(font),
        menuItems: [
          {
            key: 'open',
            label: 'Открыть',
            icon: <OpenExternalIcon />,
            onSelect: () => {
              void openLibraryFontEntry(font);
            },
          },
          {
            key: 'share',
            label: 'Поделиться',
            icon: <ShareIcon />,
            disabled: true,
          },
          {
            key: 'remove',
            label: 'Удалить',
            icon: <TrashIcon />,
            tone: 'danger',
            onSelect: () =>
              handleUpdateSavedLibrary(activeSavedLibrary.id, {
                fonts: activeSavedLibrary.fonts.filter((item) => item.id !== font.id),
              }),
          },
        ],
      };
    });
  }, [
    activeSavedLibrary,
    filteredActiveSavedLibraryFonts,
    fontsLibraryTab,
    handleUpdateSavedLibrary,
    mainTab,
    openLibraryFontEntry,
    sessionCardPreviewStyleFor,
    sessionFontLookup,
  ]);

  useEffect(() => {
    if (
      mainTab === EDITOR_MAIN_TAB_PENDING ||
      mainTab === 'library' ||
      mainTab.startsWith(EMPTY_PREFIX) ||
      !selectedFont
    ) {
      setPlainPreviewOpen(false);
    }
  }, [mainTab, selectedFont]);

  useEffect(() => {
    if (mainTab === 'library' && fontsLibraryTab === 'catalog') return;
    setCatalogSelectionActions({
      selectedCount: 0,
      downloadSelected: null,
      downloadSelectedAsFormat: null,
    });
  }, [mainTab, fontsLibraryTab]);

  const tabBarEndActions = useMemo(() => {
    const showCatalogToolbar = mainTab === 'library' && fontsLibraryTab === 'catalog';
    const showFontToolbar =
      mainTab !== EDITOR_MAIN_TAB_PENDING &&
      mainTab !== 'library' &&
      selectedFont;
    if (showCatalogToolbar) {
      const selectedCount = catalogSelectionActions.selectedCount || 0;
      const canDownloadSelected =
        selectedCount > 0 && typeof catalogSelectionActions.downloadSelected === 'function';
      const canDownloadSelectedAsFormat =
        selectedCount > 0 && typeof catalogSelectionActions.downloadSelectedAsFormat === 'function';
      return (
        <Tooltip
          as="span"
          content={
            canDownloadSelected
              ? `Скачать выделенные (${selectedCount})`
              : 'Выделите карточки в каталоге (долгий зажим), чтобы скачать'
          }
          className="inline-flex"
        >
          <CatalogDownloadSplitButton
            className="mr-3"
            tone="accent"
            disabled={!canDownloadSelected}
            primaryLabel={`Скачать${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
            primaryAriaLabel={
              selectedCount > 0
                ? `Скачать выделенные шрифты (${selectedCount})`
                : 'Скачать выделенные шрифты'
            }
            onPrimaryClick={() => catalogSelectionActions.downloadSelected?.()}
            menuItems={[
              {
                key: 'zip',
                label: 'ZIP (по умолчанию)',
                onSelect: () => catalogSelectionActions.downloadSelected?.(),
              },
              {
                key: 'ttf',
                label: 'TTF',
                disabled: !canDownloadSelectedAsFormat,
                onSelect: () => catalogSelectionActions.downloadSelectedAsFormat?.('ttf'),
              },
              {
                key: 'otf',
                label: 'OTF',
                disabled: !canDownloadSelectedAsFormat,
                onSelect: () => catalogSelectionActions.downloadSelectedAsFormat?.('otf'),
              },
              {
                key: 'woff',
                label: 'WOFF',
                disabled: !canDownloadSelectedAsFormat,
                onSelect: () => catalogSelectionActions.downloadSelectedAsFormat?.('woff'),
              },
              {
                key: 'woff2',
                label: 'WOFF2',
                disabled: !canDownloadSelectedAsFormat,
                onSelect: () => catalogSelectionActions.downloadSelectedAsFormat?.('woff2'),
              },
            ]}
          />
        </Tooltip>
      );
    }
    if (!showFontToolbar) return null;
    const canGenerate = Boolean(selectedFont.isVariableFont);
    return (
      <>
        <Tooltip
          as="span"
          content={
            canGenerate
              ? 'Статический файл по текущим осям (VF)'
              : 'Доступно только для вариативных шрифтов'
          }
          className="inline-flex"
        >
          <button
            type="button"
            disabled={!canGenerate}
            onClick={handleGenerateClick}
            className="inline-flex h-8 w-40.5 shrink-0 items-center justify-center rounded-sm border border-gray-200 bg-white px-3 text-xs uppercase font-semibold leading-none text-gray-800 transition-colors hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9] disabled:cursor-default disabled:border-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-gray-50 disabled:hover:text-gray-400"
          >
            Генерация
          </button>
        </Tooltip>
        <Tooltip content="Копирование, скачивание файла">
          <button
            type="button"
            onClick={handleExportClick}
            className="inline-flex h-8 w-40.5 shrink-0 items-center justify-center rounded-sm bg-accent px-3 text-xs uppercase font-semibold leading-none text-white transition-colors hover:bg-accent-hover"
            aria-label="Экспорт CSS: предпросмотр, копирование, скачивание файла"
          >
            Экспорт
          </button>
        </Tooltip>
        <div className="flex self-stretch">
          <Tooltip content="Полноэкранное превью" className="h-full">
            <button
              type="button"
              onClick={() => setPlainPreviewOpen(true)}
              aria-label="Полноэкранное превью текста (plain)"
              className="flex h-full min-h-12 w-12 shrink-0 items-center justify-center border-l border-gray-200 px-2 text-gray-800 transition-colors hover:text-accent"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                aria-hidden
              >
                <path
                  d="M22.75 -0.00195312C23.4404 -0.00195313 24 0.55769 24 1.24805V9.99805C24 10.5503 23.5523 10.998 23 10.998C22.4477 10.998 22 10.5503 22 9.99805V3.41211L3.41406 21.998H10C10.5523 21.998 11 22.4458 11 22.998C11 23.5503 10.5523 23.998 10 23.998H1.25C0.559645 23.998 2.41189e-06 23.4384 0 22.748V14.998C0 14.4458 0.447715 13.998 1 13.998C1.55228 13.998 2 14.4458 2 14.998V20.584L20.5859 1.99805H14C13.4477 1.99805 13 1.55033 13 0.998047C13 0.445762 13.4477 -0.00195312 14 -0.00195312H22.75Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      </>
    );
  }, [
    mainTab,
    fontsLibraryTab,
    selectedFont,
    handleExportClick,
    handleGenerateClick,
    catalogSelectionActions,
  ]);

  const libraryStatusBar = useMemo(() => {
    if (fontsLibraryTab === 'catalog') {
      const stats = getCatalogUnionStats(readGoogleFontCatalogCache(), readFontsourceCatalogCache());
      const isGoogle = catalogSource === 'google';
      const loaded = isGoogle ? stats.googleTotal > 0 : stats.fontsourceTotal > 0;
      const leading = loaded
        ? formatCatalogAvailabilityShort(stats, catalogSource)
        : isGoogle
          ? 'Google Fonts: загрузка каталога…'
          : 'Fontsource: загрузка каталога…';
      return {
        leading,
        center: (
          <span className="truncate uppercase">
            {isGoogle ? 'Google Fonts' : 'Fontsource'}
          </span>
        ),
      };
    }
    if (activeSavedLibrary) {
      const n = activeSavedLibrary.fonts?.length ?? 0;
      return {
        leading: `Шрифтов: ${n} шт.`,
        center: (
          <span className="truncate uppercase" title={activeSavedLibrary.name}>
            {activeSavedLibrary.name}
          </span>
        ),
      };
    }
    return {
      leading: '',
      center: <span className="truncate uppercase">Библиотеки</span>,
    };
  }, [
    fontsLibraryTab,
    catalogSource,
    googleCatalogTotalItems,
    fontsourceCatalogTotalItems,
    activeSavedLibrary,
  ]);

  return (
    <div className="flex h-screen min-h-0 flex-row overflow-hidden bg-gray-50">
      <Head>
        <title>Dynamic font — тестирование и сравнение шрифтов</title>
        <meta name="description" content="Профессиональный инструмент для тестирования и сравнения шрифтов" />
        <link rel="icon" href="/favicon.ico" />
        {cssString && <style>{cssString}</style>}
      </Head>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        cssCode={cssString}
        fontName={selectedFont?.name}
      />
      <GenerateFontModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedFont={selectedFont}
        variableSettings={variableSettings}
        generateStaticFontFile={generateStaticFontFile}
        downloadFile={downloadFile}
      />

      {/* Скрытый input для загрузки файлов */}
      <input
        type="file"
        ref={fileInputRef}
        id="font-upload-input"
        className="hidden"
        accept=".ttf,.otf,.woff,.woff2"
        multiple
        onChange={handleFileUpload}
      />

      {/* Левая сайдбар панель */}
      <div className="h-screen sticky top-0 left-0">
        <Sidebar
          selectedFont={sidebarSelectedFont}
          isLibraryTab={mainTab === 'library'}
          activeLibraryId={activeSavedLibrary?.id || null}
          fontLibraries={fontLibraries}
          onOpenFontLibrary={openSavedLibrary}
          onCreateFontLibrary={handleCreateSavedLibrary}
          onUpdateFontLibrary={handleUpdateSavedLibrary}
          onDeleteFontLibrary={handleDeleteSavedLibrary}
          onReorderFontLibraries={reorderFontLibraries}
          onAddFontToLibrary={addFontEntryToLibrary}
          createLibrarySeedRequest={createLibrarySeedRequest}
          onCreateLibrarySeedHandled={(requestId) =>
            setCreateLibrarySeedRequest((prev) =>
              prev?.requestId === requestId ? null : prev,
            )
          }
          setSelectedFont={pickFont}
          handleVariableSettingsChange={handleVariableSettingsChange}
          availableStyles={availableStyles}
          selectedPresetName={selectedPresetName}
          applyPresetStyle={applyPresetStyle}
          getVariableAxes={getVariableAxes}
          variableSettings={variableSettings}
          resetVariableSettings={resetVariableSettings}
          isAnimating={isAnimating}
          toggleAnimation={toggleAnimation}
          sampleTexts={sampleTexts}
        />
      </div>

      {/* Основная область просмотра с вкладками */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Панель вкладок — flex-шапка, всегда у верхнего края колонки */}
        <div className="editor-tabbar-container z-20 flex min-h-12 w-full shrink-0 items-stretch overflow-x-auto overflow-y-hidden bg-white">
          <EditorTabBar
            mainTab={mainTab}
            emptySlotIds={emptySlotIds}
            emptySlotLabelsById={emptySlotLabelsById}
            fonts={fontsVisibleInTabBar}
            fontTabPlaceholders={fontTabPlaceholders}
            showNewTabSsrFallback={mainTab === EDITOR_MAIN_TAB_PENDING && emptySlotIds.length === 0}
            onLibraryClick={() => setMainTab('library')}
            onEmptyTabClick={(slotId) => {
              setMainTab(`${EMPTY_PREFIX}${slotId}`);
              const previewFont = catalogPreviewSlotsById?.[slotId] || null;
              if (previewFont) {
                safeSelectFont(previewFont);
              } else {
                setSelectedFont(null);
              }
            }}
            onRemoveEmptySlot={handleRemoveEmptySlot}
            onFontClick={(font) => {
              setClosedLibraryFontIds((prev) => prev.filter((id) => id !== font.id));
              safeSelectFont(font);
              setMainTab(font.id);
            }}
            onRemoveFont={closeFontTab}
            onAddEmptySlot={addEmptyPreviewSlot}
            endActions={tabBarEndActions}
          />
        </div>

        {/* Контент вкладок: «Все шрифты» — внутренний скролл у каталога, не вся страница */}
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden">
          {mainTab !== EDITOR_MAIN_TAB_PENDING && mainTab !== 'library' && (
            <FontPreview
              selectedFont={sidebarSelectedFont}
              getFontFamily={getFontFamily}
              getVariationSettings={getVariationSettings}
              handleFontsUploaded={handleFontsUploadedWithNav}
              selectOrAddFontsourceFont={selectOrAddFontsourceFontWithNav}
              fontCssProperties={fontCssProperties}
              isVariableFontAnimating={isAnimating}
              plainPreviewOpen={plainPreviewOpen}
              onClosePlainPreview={closePlainPreview}
              fontLibraries={fontLibraries}
              onMoveFontToLibrary={moveFontEntryToLibrary}
              onRequestCreateLibrary={requestCreateLibraryWithFonts}
            />
          )}

          {mainTab === EDITOR_MAIN_TAB_PENDING && (
            <div className="min-h-0 flex-1 bg-gray-50" aria-hidden />
          )}

          {mainTab === 'library' && (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
              {libraryTabs.length > 1 ? (
                <div className="flex shrink-0 overflow-x-auto border-b border-gray-200 px-6 pt-6">
                  {libraryTabs.map((tab) => (
                    <UnderlineTab
                      key={tab.id}
                      isActive={fontsLibraryTab === tab.id}
                      onClick={() => setFontsLibraryTab(tab.id)}
                      onDragOver={
                        tab.id === 'catalog' ? undefined : (event) => handleLibraryTabDragOver(event, tab.id)
                      }
                      onDrop={
                        tab.id === 'catalog' ? undefined : (event) => handleLibraryTabDrop(event, tab.id)
                      }
                      onDragLeave={
                        tab.id === 'catalog'
                          ? undefined
                          : () =>
                              setLibraryDropTargetTabId((prev) => (prev === tab.id ? null : prev))
                      }
                      className={
                        libraryDropTargetTabId === tab.id
                          ? 'border-b-2 border-black text-black'
                          : ''
                      }
                    >
                      {tab.label}
                    </UnderlineTab>
                  ))}
                </div>
              ) : null}

              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-6 pt-4">
              {fontsLibraryTab === 'catalog' && (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className={catalogSource === 'google' ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' : 'hidden'}>
                    <GoogleFontsCatalogPanel
                      isActive={catalogSource === 'google'}
                      fonts={fonts}
                      fontLibraries={fontLibraries}
                      onAddFontToLibrary={addFontEntryToLibrary}
                      onRequestCreateLibrary={requestCreateLibraryWithFonts}
                      onOpenGoogleEntryInEditorTab={openGoogleCatalogEntryInEditorTab}
                      onSelectionActionsChange={handleCatalogSelectionActionsChange}
                      onTotalItemsChange={setGoogleCatalogTotalItems}
                      trailingToolbar={
                        <SegmentedControl
                          value={catalogSource}
                          onChange={setCatalogSource}
                          options={CATALOG_SOURCE_OPTIONS}
                          variant="pairOutline"
                          className="w-full max-w-none [&>button]:w-auto [&>button]:flex-1"
                        />
                      }
                    />
                  </div>
                  <div className={catalogSource === 'fontsource' ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' : 'hidden'}>
                    <FontsourceCatalogPanel
                      isActive={catalogSource === 'fontsource'}
                      fonts={fonts}
                      fontLibraries={fontLibraries}
                      onAddFontToLibrary={addFontEntryToLibrary}
                      onRequestCreateLibrary={requestCreateLibraryWithFonts}
                      onOpenFontsourceInEditorTab={openFontsourceSlugInEditorTab}
                      onSelectionActionsChange={handleCatalogSelectionActionsChange}
                      onTotalItemsChange={setFontsourceCatalogTotalItems}
                      trailingToolbar={
                        <SegmentedControl
                          value={catalogSource}
                          onChange={setCatalogSource}
                          options={CATALOG_SOURCE_OPTIONS}
                          variant="pairOutline"
                          className="w-full max-w-none [&>button]:w-auto [&>button]:flex-1"
                        />
                      }
                    />
                  </div>
                </div>
              )}

              {activeSavedLibrary && (
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-7">
                  <ScopeFilterToolbar
                    id="saved-library-fonts-scope"
                    value={savedLibraryFontsScope}
                    onChange={setSavedLibraryFontsScope}
                    options={activeSavedLibraryScopeOptions}
                    count={activeSavedLibraryScopeCounts[savedLibraryFontsScope] ?? 0}
                    ariaLabel={`Показать шрифты в библиотеке ${activeSavedLibrary.name}`}
                  />
                  <div className="min-h-0 flex-1 pb-10">
                  {filteredActiveSavedLibraryFonts.length > 0 || savedLibraryFontsScope === 'all' || savedLibraryFontsScope === 'local' ? (
                    <div>
                      <SortableFontCardGrid
                        items={activeSavedLibraryItems}
                        draggable={savedLibraryFontsScope === 'all'}
                        onMoveItem={(draggedId, targetId) =>
                          handleMoveLibraryFont(activeSavedLibrary.id, draggedId, targetId)
                        }
                        renderAfter={
                          (savedLibraryFontsScope === 'all' || savedLibraryFontsScope === 'local') && (
                            <UploadFromDiskCard
                              onClick={() => {
                                setFileUploadTarget('library');
                                fileInputRef.current?.click();
                              }}
                            />
                          )
                        }
                      />
                    </div>
                  ) : (
                    <p className="py-4 text-sm text-gray-500">В этой выборке пока пусто.</p>
                  )}
                  </div>
                  {savedLibraryFontsScope === 'all' && filteredActiveSavedLibraryFonts.length > 1 ? (
                    <LibraryReorderHint />
                  ) : null}
                </div>
              )}
              </div>
              <EditorStatusBar
                leading={libraryStatusBar.leading}
                center={libraryStatusBar.center}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
