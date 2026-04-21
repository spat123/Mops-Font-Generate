import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import FontPreview from '../components/FontPreview';
import ExportModal from '../components/ExportModal';
import GenerateFontModal from '../components/GenerateFontModal';
import { toast } from 'react-toastify';
import { useFontContext } from '../contexts/FontContext';
import { useSettings, getDefaultPreviewSettingsSnapshot } from '../contexts/SettingsContext';
import GoogleFontsCatalogPanel from '../components/GoogleFontsCatalogPanel';
import FontsourceCatalogPanel from '../components/FontsourceCatalogPanel';
import { getFormatFromExtension, sessionFontCardPreviewStyle } from '../utils/fontUtilsCommon';
import { UnderlineTab } from '../components/ui/UnderlineTab';
import { SortableFontCardGrid } from '../components/ui/SortableFontCardGrid';
import { Tooltip } from '../components/ui/Tooltip';
import { EditorTabBar, EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { ScopeFilterToolbar } from '../components/ui/ScopeFilterToolbar';
import { UploadFromDiskCard } from '../components/ui/UploadFromDiskCard';
import { updateFontSettings } from '../utils/db';
import { useFontLibraries } from '../hooks/useFontLibraries';
import { areIdOrdersEqual, moveItemById, orderItemsByIdList } from '../utils/arrayOrder';
import { getLibrarySourceLabel, sanitizeLibraryFont } from '../utils/fontLibraryUtils';
import {
  collectPerFontPreviewSnapshot,
  applyPerFontPreviewSnapshot,
} from '../utils/perFontPreviewSettings';

function isFontTabId(tab) {
  return typeof tab === 'string' && tab !== 'library' && !tab.startsWith(EMPTY_PREFIX);
}

/** После F5 восстанавливаем активную вкладку редактора (иначе остаётся «Новый» и сбрасывается выбор). */
const EDITOR_MAIN_TAB_LS_KEY = 'editorMainTab';

/** Список id слотов «Новый» (пустой массив = все закрыты, не создаём фиктивную вкладку). */
const EDITOR_EMPTY_SLOTS_LS_KEY = 'editorEmptySlots';

/** Вкладки шрифта закрыты крестиком (×), но шрифт остаётся в сессии — после F5 не открываем их снова. */
const EDITOR_CLOSED_FONT_TAB_IDS_KEY = 'editorClosedFontTabIds';

/** Внутри экрана «Все шрифты»: «В сессии» | «Все» (каталог). */
const FONTS_LIBRARY_INNER_TAB_LS_KEY = 'fontsLibraryInnerTab';
const SAVED_LIBRARY_TAB_PREFIX = 'saved-library:';
const SESSION_FONT_ORDER_LS_KEY = 'mopsSessionFontOrder';

/** Лёгкий снимок вкладок шрифтов для первого кадра после F5 (пока IndexedDB не отдал blobs). */
const SESSION_FONT_TABS_PREVIEW_KEY = 'mopsSessionFontTabsPreview';

/** Лёгкий снимок списка шрифтов в сессии для панели «В сессии» (не зависит от закрытых вкладок). */
const SESSION_FONTS_PANEL_PREVIEW_KEY = 'mopsSessionFontsPanelPreview';

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

/** Вкладки внутри экрана «Все шрифты»: сессия · единый каталог */
const LIBRARY_MAIN_TABS = [
  { id: 'session', label: 'В сессии' },
  { id: 'catalog', label: 'Все' },
];

function makeSavedLibraryTabId(libraryId) {
  return `${SAVED_LIBRARY_TAB_PREFIX}${libraryId}`;
}

function readSavedLibraryId(tabId) {
  return typeof tabId === 'string' && tabId.startsWith(SAVED_LIBRARY_TAB_PREFIX)
    ? tabId.slice(SAVED_LIBRARY_TAB_PREFIX.length)
    : null;
}

const CATALOG_SOURCE_OPTIONS = [
  { value: 'google', label: 'Google', title: 'Каталог Google Fonts' },
  { value: 'fontsource', label: 'Fontsource', title: 'Каталог Fontsource' },
];

/** Подвкладки блока «В сессии»: все добавленные шрифты или по источнику */
const SESSION_FONTS_SCOPE_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'local', label: 'С диска' },
  { id: 'google', label: 'Google' },
  { id: 'fontsource', label: 'Fontsource' },
];

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
  return SESSION_FONTS_SCOPE_TABS.map((tab) => ({
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

function ReorderHint({ children }) {
  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 text-xs uppercase text-gray-400 opacity-50 transition-opacity hover:opacity-100">
      {children}
    </div>
  );
}

function fontSourceLabel(font) {
  if (font.source === 'google') return 'Google Font';
  if (font.source === 'fontsource') return 'Fontsource';
  return 'Пользовательский';
}

/** Скелетон карточки в «В сессии», пока IndexedDB не вернул шрифты (есть кэш подписей). */
function SessionFontCardSkeleton({ title }) {
  return (
    <Tooltip
      as="div"
      content={title}
      className="relative animate-pulse rounded-lg border border-gray-100 bg-gray-50/90 p-4"
      aria-hidden="true"
    >
      <div className="h-4 w-2/3 max-w-[12rem] rounded bg-gray-200" />
      <div className="mt-3 h-7 w-full max-w-full rounded bg-gray-200/75" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-200/65" />
    </Tooltip>
  );
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
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [cssString, setCssString] = useState('');
  /** Пустые слоты «Новый» — после mount подставляются из localStorage (может быть []). */
  const [emptySlotIds, setEmptySlotIds] = useState([]);
  /** До чтения shell в useLayoutEffect — EDITOR_MAIN_TAB_PENDING (не «Все шрифты»). */
  const [mainTab, setMainTab] = useState(EDITOR_MAIN_TAB_PENDING);
  /** Подвкладка внутри «Все шрифты»: сессия | каталог (Google / Fontsource) */
  const [fontsLibraryTab, setFontsLibraryTab] = useState('session');
  /** Источник внутри вкладки «Все» */
  const [catalogSource, setCatalogSource] = useState('google');
  /** Вкладки редактора: скрытые id остаются в сессии, снова открываются с карточки */
  const [closedFontTabIds, setClosedFontTabIds] = useState([]);
  const closedFontTabIdsRef = useRef(closedFontTabIds);
  closedFontTabIdsRef.current = closedFontTabIds;
  /** Подписи вкладок из прошлого визита — показываем до прихода fonts из IndexedDB (без «мигания»). */
  const [tabStripPreviewFromCache, setTabStripPreviewFromCache] = useState([]);
  /** Снимок списка шрифтов для панели «В сессии» — чтобы не был кадр «только кнопка загрузки». */
  const [sessionFontsPanelPreviewFromCache, setSessionFontsPanelPreviewFromCache] = useState([]);
  /** Фильтр карточек в блоке «В сессии» */
  const [sessionFontsScope, setSessionFontsScope] = useState('all'); // 'all' | 'local' | 'google' | 'fontsource'
  const [savedLibraryFontsScope, setSavedLibraryFontsScope] = useState('all');
  const [fileUploadTarget, setFileUploadTarget] = useState('session');
  const [createLibrarySeedRequest, setCreateLibrarySeedRequest] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [plainPreviewOpen, setPlainPreviewOpen] = useState(false);
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
  const initialSessionFontOrderIdsRef = useRef([]);
  const hasAppliedInitialSessionFontOrderRef = useRef(false);

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

    try {
      const rawPanel = localStorage.getItem(SESSION_FONTS_PANEL_PREVIEW_KEY);
      if (rawPanel) {
        const p = JSON.parse(rawPanel);
        if (
          Array.isArray(p) &&
          p.length > 0 &&
          p.every(
            (x) => x && typeof x.id === 'string' && (typeof x.label === 'string' || typeof x.name === 'string'),
          )
        ) {
          setSessionFontsPanelPreviewFromCache(
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
      const rawClosed = localStorage.getItem(EDITOR_CLOSED_FONT_TAB_IDS_KEY);
      if (rawClosed) {
        const p = JSON.parse(rawClosed);
        if (Array.isArray(p) && p.every((id) => typeof id === 'string')) {
          setClosedFontTabIds(p);
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const inner = localStorage.getItem(FONTS_LIBRARY_INNER_TAB_LS_KEY);
      if (inner === 'session' || inner === 'catalog' || inner?.startsWith(SAVED_LIBRARY_TAB_PREFIX)) {
        setFontsLibraryTab(inner);
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
      window.localStorage.setItem(EDITOR_CLOSED_FONT_TAB_IDS_KEY, JSON.stringify(closedFontTabIds));
    } catch {
      /* ignore quota */
    }
  }, [closedFontTabIds, hasRestoredEditorMainTab]);

  useEffect(() => {
    if (!hasRestoredEditorMainTab || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FONTS_LIBRARY_INNER_TAB_LS_KEY, fontsLibraryTab);
    } catch {
      /* ignore quota */
    }
  }, [fontsLibraryTab, hasRestoredEditorMainTab]);

  useEffect(() => {
    if (fontsLibraryTab === 'session' || fontsLibraryTab === 'catalog') return;
    const libraryId = readSavedLibraryId(fontsLibraryTab);
    if (!libraryId || !fontLibraries.some((library) => library.id === libraryId)) {
      setFontsLibraryTab('session');
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
    () => (isFontTabId(mainTab) ? selectedFont : null),
    [mainTab, selectedFont],
  );

  /** После merge previewSettings в массиве fonts — обновить ссылку selectedFont */
  useEffect(() => {
    if (!selectedFont?.id) return;
    const fresh = fonts.find((f) => f.id === selectedFont.id);
    if (fresh && fresh !== selectedFont) {
      setSelectedFont(fresh);
    }
  }, [fonts, selectedFont, setSelectedFont]);

  const filteredSessionFonts = useMemo(() => {
    if (sessionFontsScope === 'all') return fonts;
    return fonts.filter((f) => f.source === sessionFontsScope);
  }, [fonts, sessionFontsScope]);

  const sessionScopeCounts = useMemo(() => countFontsByScope(fonts), [fonts]);
  const sessionScopeOptions = useMemo(() => buildScopeSelectOptions(sessionScopeCounts), [sessionScopeCounts]);

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
    return activeSavedLibrary.fonts.filter((font) => (font?.source || 'session') === savedLibraryFontsScope);
  }, [activeSavedLibrary, savedLibraryFontsScope]);

  const activeSavedLibraryScopeCounts = useMemo(
    () => countFontsByScope(activeSavedLibrary?.fonts || []),
    [activeSavedLibrary],
  );
  const activeSavedLibraryScopeOptions = useMemo(
    () => buildScopeSelectOptions(activeSavedLibraryScopeCounts),
    [activeSavedLibraryScopeCounts],
  );

  const sessionFontLookup = useMemo(() => {
    const byLabel = new Map();
    fonts.forEach((font) => {
      const keys = [font.displayName, font.name].filter(Boolean);
      keys.forEach((key) => {
        byLabel.set(String(key).toLowerCase(), font);
      });
    });
    return byLabel;
  }, [fonts]);

  const fontsVisibleInTabBar = useMemo(
    () => fonts.filter((f) => !closedFontTabIds.includes(f.id)),
    [fonts, closedFontTabIds],
  );

  /** Пока IndexedDB не отдал шрифты — рисуем «заглушки» вкладок из sessionStorage (последний визит). */
  const fontTabPlaceholders = useMemo(() => {
    if (fonts.length > 0) return null;
    if (isInitialLoadComplete) return null;
    if (!tabStripPreviewFromCache.length) return null;
    return tabStripPreviewFromCache;
  }, [fonts.length, isInitialLoadComplete, tabStripPreviewFromCache]);

  /** Карточки «В сессии»: скелетоны по тому же кэшу, что и вкладки, пока fonts пуст. */
  const showSessionFontCardSkeletons = useMemo(
    () => !isInitialLoadComplete && fonts.length === 0 && sessionFontsPanelPreviewFromCache.length > 0,
    [isInitialLoadComplete, fonts.length, sessionFontsPanelPreviewFromCache.length],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialLoadComplete) return;
    const visible = fonts.filter((f) => !closedFontTabIds.includes(f.id));
    if (visible.length === 0) {
      try {
        sessionStorage.removeItem(SESSION_FONT_TABS_PREVIEW_KEY);
      } catch {
        /* ignore */
      }
      setTabStripPreviewFromCache([]);
    }
    if (visible.length > 0) {
      try {
        const snapshot = visible.map((f) => ({
          id: f.id,
          label: (f.displayName || f.name || 'Шрифт').slice(0, 120),
        }));
        sessionStorage.setItem(SESSION_FONT_TABS_PREVIEW_KEY, JSON.stringify(snapshot));
      } catch {
        /* ignore */
      }
    }
  }, [fonts, closedFontTabIds, isInitialLoadComplete]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialLoadComplete) return;
    if (fonts.length === 0) {
      try {
        localStorage.removeItem(SESSION_FONTS_PANEL_PREVIEW_KEY);
      } catch {
        /* ignore */
      }
      setSessionFontsPanelPreviewFromCache([]);
      return;
    }
    try {
      const snapshot = fonts.map((f) => ({
        id: f.id,
        label: (f.displayName || f.name || 'Шрифт').slice(0, 120),
      }));
      localStorage.setItem(SESSION_FONTS_PANEL_PREVIEW_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore */
    }
  }, [fonts, isInitialLoadComplete]);

  const sessionCardPreviewStyleFor = useCallback((font) => {
    if (font.source === 'google') {
      const family = font.displayName || font.name;
      return { fontFamily: `'${family}', sans-serif`, fontSize: '20px' };
    }
    return sessionFontCardPreviewStyle(font);
  }, []);

  const handleFontsUploadedWithNav = useCallback(
    async (newFonts) => {
      const fromEmptySlot = mainTab.startsWith(EMPTY_PREFIX) ? mainTab.slice(EMPTY_PREFIX.length) : null;
      const added = await handleFontsUploaded(newFonts);
      const first = Array.isArray(newFonts) && newFonts[0];
      const src = first?.source;
      if (added?.id) {
        if (fromEmptySlot) {
          setEmptySlotIds((ids) => ids.filter((x) => x !== fromEmptySlot));
        }
        setMainTab(added.id);
      }
      setSessionFontsScope('all');
      if (src === 'google') {
        setFontsLibraryTab('catalog');
        setCatalogSource('google');
      } else if (src === 'fontsource') {
        setFontsLibraryTab('catalog');
        setCatalogSource('fontsource');
      }
      if (added?.id) {
        setClosedFontTabIds((prev) => prev.filter((id) => id !== added.id));
      }
      return added || null;
    },
    [handleFontsUploaded, mainTab],
  );

  const selectOrAddFontsourceFontWithNav = useCallback(
    async (fontFamilyName, forceVariableFont = false) => {
      const fromEmptySlot = mainTab.startsWith(EMPTY_PREFIX) ? mainTab.slice(EMPTY_PREFIX.length) : null;
      const added = await selectOrAddFontsourceFont(fontFamilyName, forceVariableFont);
      if (added?.id) {
        if (fromEmptySlot) {
          setEmptySlotIds((ids) => ids.filter((x) => x !== fromEmptySlot));
        }
        setMainTab(added.id);
      }
      setSessionFontsScope('all');
      setFontsLibraryTab('catalog');
      setCatalogSource('fontsource');
      if (added?.id) {
        setClosedFontTabIds((prev) => prev.filter((id) => id !== added.id));
      }
      return added || null;
    },
    [selectOrAddFontsourceFont, mainTab],
  );

  /** Выбор шрифта с сайдбара: с подсветкой вкладки, если не открыт каталог */
  const pickFont = useCallback(
    (font) => {
      safeSelectFont(font);
      setClosedFontTabIds((prev) => prev.filter((id) => id !== font.id));
      if (mainTab !== 'library') {
        setMainTab(font.id);
      }
    },
    [safeSelectFont, mainTab],
  );

  /** × на вкладке шрифта: только скрыть вкладку, шрифт остаётся в сессии */
  const closeFontTab = useCallback(
    (fontId) => {
      const prevClosed = closedFontTabIdsRef.current;
      const nextClosed = prevClosed.includes(fontId) ? prevClosed : [...prevClosed, fontId];
      setClosedFontTabIds(nextClosed);

      if (mainTab !== fontId) return;

      const visible = fonts.find((f) => !nextClosed.includes(f.id));
      if (visible) {
        setMainTab(visible.id);
        safeSelectFont(visible);
        return;
      }
      if (emptySlotIds.length > 0) {
        setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
        setSelectedFont(null);
        return;
      }
      setMainTab('library');
      setSelectedFont(null);
    },
    [mainTab, fonts, emptySlotIds, safeSelectFont, setSelectedFont],
  );

  /** × на карточке в сессии: удалить шрифт из сессии */
  const removeFontFromSession = useCallback(
    (fontId) => {
      if (mainTab === fontId) {
        setMainTab('library');
      }
      setClosedFontTabIds((prev) => prev.filter((id) => id !== fontId));
      removeFont(fontId);
    },
    [mainTab, removeFont],
  );

  const sessionGridItems = useMemo(
    () =>
      filteredSessionFonts.map((font) => ({
        id: font.id,
        selected: mainTab === font.id,
        title: font.displayName || font.name,
        subtitle: fontSourceLabel(font),
        previewStyle: sessionCardPreviewStyleFor(font),
        onCardClick: () => {
          safeSelectFont(font);
          setClosedFontTabIds((prev) => prev.filter((id) => id !== font.id));
          setMainTab(font.id);
        },
        onRemove: () => removeFontFromSession(font.id),
      })),
    [filteredSessionFonts, mainTab, removeFontFromSession, safeSelectFont, sessionCardPreviewStyleFor],
  );

  /** Убрать из closed только id удалённых из сессии шрифтов — не при fonts=[] до загрузки IndexedDB (иначе сбрасывается весь список). */
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const idSet = new Set(fonts.map((f) => f.id));
    setClosedFontTabIds((prev) => {
      const next = prev.filter((id) => idSet.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [fonts, isInitialLoadComplete]);

  useEffect(() => {
    if (!isFontTabId(mainTab)) return;
    if (!closedFontTabIds.includes(mainTab)) return;
    const visible = fonts.find((f) => !closedFontTabIds.includes(f.id));
    if (visible) {
      setMainTab(visible.id);
      safeSelectFont(visible);
    } else if (emptySlotIds.length > 0) {
      setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
      setSelectedFont(null);
    } else {
      setMainTab('library');
      setSelectedFont(null);
    }
  }, [
    mainTab,
    closedFontTabIds,
    fonts,
    emptySlotIds,
    safeSelectFont,
    setSelectedFont,
  ]);

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
      if (mainTab === tabKey) {
        setMainTab('library');
      }
    },
    [mainTab],
  );

  useEffect(() => {
    if (!isInitialLoadComplete) return;
    if (mainTab === EDITOR_MAIN_TAB_PENDING) return;
    if (mainTab === 'library' || mainTab.startsWith(EMPTY_PREFIX)) return;
    if (fonts.length === 0) return;
    const exists = fonts.some((f) => f.id === mainTab);
    if (!exists) {
      if (selectedFont?.id && fonts.some((f) => f.id === selectedFont.id)) {
        setMainTab(selectedFont.id);
        setClosedFontTabIds((prev) => prev.filter((id) => id !== selectedFont.id));
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
      setFileUploadTarget('session');
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
    (draft) => createFontLibrary(draft),
    [createFontLibrary],
  );

  const handleUpdateSavedLibrary = useCallback(
    (libraryId, draft) => updateFontLibrary(libraryId, draft),
    [updateFontLibrary],
  );

  const handleDeleteSavedLibrary = useCallback(
    (libraryId) => {
      deleteFontLibrary(libraryId);
      setFontsLibraryTab((prev) => (prev === makeSavedLibraryTabId(libraryId) ? 'session' : prev));
    },
    [deleteFontLibrary],
  );

  const handleMoveSessionFont = useCallback((draggedId, targetId) => {
    setFonts((prev) => moveItemById(prev, draggedId, targetId));
  }, [setFonts]);

  const handleMoveLibraryFont = useCallback(
    (libraryId, draggedFontId, targetFontId) => {
      reorderLibraryFonts(libraryId, draggedFontId, targetFontId);
    },
    [reorderLibraryFonts],
  );

  const addFontEntryToLibrary = useCallback(
    (libraryId, fontEntry) => {
      const entry = sanitizeLibraryFont(fontEntry);
      if (!entry) return;
      const targetLibrary = fontLibraries.find((library) => library.id === libraryId);
      if (!targetLibrary) return;
      if (targetLibrary.fonts.some((item) => item.id === entry.id)) return;
      handleUpdateSavedLibrary(libraryId, {
        fonts: [...targetLibrary.fonts, entry],
      });
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

  const activeSavedLibraryItems = useMemo(() => {
    if (!activeSavedLibrary) return [];
    return filteredActiveSavedLibraryFonts.map((font) => {
      const sessionFont = sessionFontLookup.get(String(font.label || '').toLowerCase()) || null;
      return {
        id: font.id,
        selected: sessionFont ? mainTab === sessionFont.id : false,
        title: font.label,
        subtitle: sessionFont
          ? `${getLibrarySourceLabel(font.source)} · В сессии`
          : getLibrarySourceLabel(font.source),
        previewStyle: sessionFont ? sessionCardPreviewStyleFor(sessionFont) : undefined,
        onCardClick: sessionFont
          ? () => {
              safeSelectFont(sessionFont);
              setClosedFontTabIds((prev) => prev.filter((id) => id !== sessionFont.id));
              setMainTab(sessionFont.id);
            }
          : undefined,
        onRemove: () =>
          handleUpdateSavedLibrary(activeSavedLibrary.id, {
            fonts: activeSavedLibrary.fonts.filter((item) => item.id !== font.id),
          }),
      };
    });
  }, [
    activeSavedLibrary,
    filteredActiveSavedLibraryFonts,
    handleUpdateSavedLibrary,
    mainTab,
    safeSelectFont,
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

  const tabBarEndActions = useMemo(() => {
    const showFontToolbar =
      mainTab !== EDITOR_MAIN_TAB_PENDING &&
      mainTab !== 'library' &&
      !mainTab.startsWith(EMPTY_PREFIX) &&
      selectedFont;
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
        <div className="flex self-stretch border-l border-gray-200">
          <Tooltip content="Полноэкранное превью" className="h-full">
            <button
              type="button"
              onClick={() => setPlainPreviewOpen(true)}
              aria-label="Полноэкранное превью текста (plain)"
              className="flex h-full min-h-12 w-12 shrink-0 items-center justify-center border-0 px-2 text-gray-800 transition-colors hover:text-accent"
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
  }, [mainTab, selectedFont, handleExportClick, handleGenerateClick]);

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
          animationSpeed={animationSpeed}
          setAnimationSpeed={setAnimationSpeed}
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
            fonts={fontsVisibleInTabBar}
            fontTabPlaceholders={fontTabPlaceholders}
            showNewTabSsrFallback={mainTab === EDITOR_MAIN_TAB_PENDING && emptySlotIds.length === 0}
            onLibraryClick={() => setMainTab('library')}
            onEmptyTabClick={(slotId) => {
              setMainTab(`${EMPTY_PREFIX}${slotId}`);
              setSelectedFont(null);
            }}
            onRemoveEmptySlot={handleRemoveEmptySlot}
            onFontClick={(font) => {
              safeSelectFont(font);
              setClosedFontTabIds((prev) => prev.filter((id) => id !== font.id));
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
              selectedFont={mainTab.startsWith(EMPTY_PREFIX) ? null : selectedFont}
              getFontFamily={getFontFamily}
              getVariationSettings={getVariationSettings}
              handleFontsUploaded={handleFontsUploadedWithNav}
              selectOrAddFontsourceFont={selectOrAddFontsourceFontWithNav}
              fontCssProperties={fontCssProperties}
              isVariableFontAnimating={isAnimating}
              plainPreviewOpen={plainPreviewOpen}
              onClosePlainPreview={closePlainPreview}
            />
          )}

          {mainTab === EDITOR_MAIN_TAB_PENDING && (
            <div className="min-h-0 flex-1 bg-gray-50" aria-hidden />
          )}

          {mainTab === 'library' && (
            <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white p-6">
              <div className="mb-4 flex shrink-0 overflow-x-auto border-b border-gray-200">
                {libraryTabs.map((tab) => (
                  <UnderlineTab
                    key={tab.id}
                    isActive={fontsLibraryTab === tab.id}
                    onClick={() => setFontsLibraryTab(tab.id)}
                  >
                    {tab.label}
                  </UnderlineTab>
                ))}
              </div>

              {fontsLibraryTab === 'session' && (
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <ScopeFilterToolbar
                    id="session-fonts-scope"
                    value={sessionFontsScope}
                    onChange={setSessionFontsScope}
                    options={sessionScopeOptions}
                    count={sessionScopeCounts[sessionFontsScope] ?? 0}
                    ariaLabel="Показать шрифты в сессии"
                  />
                  <div className="min-h-0 flex-1 pb-10">
                  {showSessionFontCardSkeletons ? (
                    <div className="grid max-w-full shrink-0 grid-cols-2 gap-4 pb-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {sessionFontsPanelPreviewFromCache.map((row) => (
                        <SessionFontCardSkeleton key={row.id} title={row.label} />
                      ))}
                    </div>
                  ) : (
                    <SortableFontCardGrid
                      items={sessionGridItems}
                      draggable={sessionFontsScope === 'all'}
                      onMoveItem={handleMoveSessionFont}
                      renderAfter={
                        (sessionFontsScope === 'all' || sessionFontsScope === 'local') && (
                          <UploadFromDiskCard
                            onClick={() => {
                              setFileUploadTarget('session');
                              fileInputRef.current?.click();
                            }}
                          />
                        )
                      }
                    />
                  )}
                  {filteredSessionFonts.length === 0 &&
                    !showSessionFontCardSkeletons &&
                    sessionFontsScope !== 'all' &&
                    sessionFontsScope !== 'local' && (
                      <p className="shrink-0 text-sm text-gray-500">
                        В этом разделе пока пусто. Откройте «Все» и выберите каталог Google или Fontsource, чтобы
                        добавить шрифт.
                      </p>
                    )}
                  </div>
                  {sessionFontsScope === 'all' && filteredSessionFonts.length > 1 && !showSessionFontCardSkeletons ? (
                    <ReorderHint>
                      Перетаскивайте карточки, чтобы менять порядок в сессии
                    </ReorderHint>
                  ) : null}
                </div>
              )}

              {fontsLibraryTab === 'catalog' && (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  {catalogSource === 'google' ? (
                    <GoogleFontsCatalogPanel
                      fonts={fonts}
                      handleFontsUploaded={handleFontsUploadedWithNav}
                      fontLibraries={fontLibraries}
                      onAddFontToLibrary={addFontEntryToLibrary}
                      onRequestCreateLibrary={requestCreateLibraryWithFonts}
                      trailingToolbar={
                        <SegmentedControl
                          value={catalogSource}
                          onChange={setCatalogSource}
                          options={CATALOG_SOURCE_OPTIONS}
                          variant="pairOutline"
                          className="max-w-full"
                        />
                      }
                    />
                  ) : (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                      <div className="mb-2 flex shrink-0 justify-start border-b border-gray-200 pb-2">
                        <SegmentedControl
                          value={catalogSource}
                          onChange={setCatalogSource}
                          options={CATALOG_SOURCE_OPTIONS}
                          variant="pairOutline"
                          className="max-w-full"
                        />
                      </div>
                      <p className="mb-2 max-w-3xl shrink-0 text-xs text-gray-500">
                        Пакеты @fontsource из package.json всегда в списке. Удаление из сессии не убирает строку —
                        снова нажмите «Добавить в сессию».
                      </p>
                      <FontsourceCatalogPanel
                        fonts={fonts}
                        selectOrAddFontsourceFont={selectOrAddFontsourceFontWithNav}
                        fontLibraries={fontLibraries}
                        onAddFontToLibrary={addFontEntryToLibrary}
                        onRequestCreateLibrary={requestCreateLibraryWithFonts}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeSavedLibrary && (
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
                    <ReorderHint>
                      Перетаскивайте карточки, чтобы менять порядок в библиотеке.
                    </ReorderHint>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
