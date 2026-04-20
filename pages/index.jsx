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
import { SessionFontCard } from '../components/ui/SessionFontCard';
import { EditorTabBar, EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { CustomSelect } from '../components/ui/CustomSelect';
import { customSelectTriggerClass } from '../components/ui/nativeSelectFieldClasses';
import { updateFontSettings } from '../utils/db';
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

function fontSourceLabel(font) {
  if (font.source === 'google') return 'Google Font';
  if (font.source === 'fontsource') return 'Fontsource';
  return 'Пользовательский';
}

/** Скелетон карточки в «В сессии», пока IndexedDB не вернул шрифты (есть кэш подписей). */
function SessionFontCardSkeleton({ title }) {
  return (
    <div
      className="relative animate-pulse rounded-lg border border-gray-100 bg-gray-50/90 p-4"
      aria-hidden="true"
      title={title}
    >
      <div className="h-4 w-2/3 max-w-[12rem] rounded bg-gray-200" />
      <div className="mt-3 h-7 w-full max-w-full rounded bg-gray-200/75" />
      <div className="mt-2 h-3 w-1/2 rounded bg-gray-200/65" />
    </div>
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
    lineHeight, setLineHeight, 
    letterSpacing, setLetterSpacing, 
    textColor, setTextColor, 
    backgroundColor, setBackgroundColor, 
    viewMode, setViewMode,
    textDirection, setTextDirection, 
    textAlignment, setTextAlignment, 
    textCase, setTextCase,
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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [plainPreviewOpen, setPlainPreviewOpen] = useState(false);

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
    lineHeight,
    letterSpacing,
    textColor,
    backgroundColor,
    viewMode,
    textDirection,
    textAlignment,
    textCase,
    verticalAlignment,
    textFill,
  };

  const previewSettersRef = useRef({});
  previewSettersRef.current = {
    setText,
    setFontSize,
    setLineHeight,
    setLetterSpacing,
    setTextColor,
    setBackgroundColor,
    setViewMode,
    setTextDirection,
    setTextAlignment,
    setTextCase,
    setTextCenter,
    setVerticalAlignment,
    setTextFill,
  };

  const lastMainTabForPreviewRef = useRef(null);

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
      if (inner === 'session' || inner === 'catalog') {
        setFontsLibraryTab(inner);
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
      const newFonts = Array.from(files).map((file) => ({
        file: file,
        name: file.name,
      }));
      await handleFontsUploadedWithNav(newFonts);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        <span
          className="inline-flex"
          title={
            canGenerate
              ? 'Сгенерировать статический файл по текущим осям (VF)'
              : 'Доступно только для вариативных шрифтов'
          }
        >
          <button
            type="button"
            disabled={!canGenerate}
            onClick={handleGenerateClick}
            className="inline-flex h-8 w-40.5 shrink-0 items-center justify-center rounded-sm border border-gray-200 bg-white px-3 text-xs uppercase font-semibold leading-none text-gray-800 transition-colors hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9] disabled:cursor-not-allowed disabled:border-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-gray-50 disabled:hover:text-gray-400"
          >
            Генерация
          </button>
        </span>
        <button
          type="button"
          onClick={handleExportClick}
          title="Экспорт CSS: предпросмотр, копирование, скачивание файла"
          className="inline-flex h-8 w-40.5 shrink-0 items-center justify-center rounded-sm bg-accent px-3 text-xs uppercase font-semibold leading-none text-white transition-colors hover:bg-accent-hover"
        >
          Экспорт
        </button>
        <div className="flex self-stretch border-l border-gray-200">
          <button
            type="button"
            onClick={() => setPlainPreviewOpen(true)}
            title="Полноэкранное превью текста (plain)"
            aria-label="Полноэкранное превью текста (plain)"
            className="flex h-full min-h-12 w-12 shrink-0 items-center justify-center border-0 px-2 text-gray-800 transition-colors hover:text-accent"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4 shrink-0"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              />
            </svg>
          </button>
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
              <div className="mb-4 flex shrink-0">
                {LIBRARY_MAIN_TABS.map((tab) => (
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
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                  <div className="flex shrink-0 pb-3">
                    <div className="w-full min-w-0 sm:max-w-[min(100%,18rem)] sm:min-w-[14rem]">
                      <CustomSelect
                        id="session-fonts-scope"
                        value={sessionFontsScope}
                        onChange={setSessionFontsScope}
                        className={customSelectTriggerClass()}
                        aria-label="Показать шрифты в сессии"
                        options={SESSION_FONTS_SCOPE_TABS.map((t) => ({
                          value: t.id,
                          label: t.label,
                        }))}
                      />
                    </div>
                  </div>
                  <div className="grid max-w-full shrink-0 grid-cols-2 gap-4 pb-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {showSessionFontCardSkeletons
                      ? sessionFontsPanelPreviewFromCache.map((row) => (
                          <SessionFontCardSkeleton key={row.id} title={row.label} />
                        ))
                      : filteredSessionFonts.map((font) => (
                          <SessionFontCard
                            key={font.id}
                        selected={mainTab === font.id}
                            title={font.displayName || font.name}
                            subtitle={fontSourceLabel(font)}
                            previewStyle={sessionCardPreviewStyleFor(font)}
                            onCardClick={() => {
                              safeSelectFont(font);
                              setClosedFontTabIds((prev) => prev.filter((id) => id !== font.id));
                              setMainTab(font.id);
                            }}
                            onRemove={() => removeFontFromSession(font.id)}
                          />
                        ))}

                    {(sessionFontsScope === 'all' || sessionFontsScope === 'local') && (
                      <div
                        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-4 text-center transition-colors duration-200 hover:bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5 text-gray-600"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </div>
                        <div className="text-sm font-medium">Загрузить с диска</div>
                        <div className="mt-1 text-xs text-gray-500">TTF, OTF, WOFF или WOFF2</div>
                      </div>
                    )}
                  </div>
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
              )}

              {fontsLibraryTab === 'catalog' && (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  {catalogSource === 'google' ? (
                    <GoogleFontsCatalogPanel
                      fonts={fonts}
                      handleFontsUploaded={handleFontsUploadedWithNav}
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
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 