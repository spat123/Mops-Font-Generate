import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import Sidebar from '../components/Sidebar';
import FontPreview from '../components/FontPreview';
import ExportModal from '../components/ExportModal';
import GenerateFontModal from '../components/GenerateFontModal';
import { toast } from '../utils/appNotify';
import { useFontContext } from '../contexts/FontContext';
import { useSettings, getDefaultPreviewSettingsSnapshot } from '../contexts/SettingsContext';
import { getFormatFromExtension, sessionFontCardPreviewStyle } from '../utils/fontUtilsCommon';
import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from '../utils/googleFontLoader';
import {
  buildGoogleFontGlyphSampleText,
  hasGoogleScriptGlyphSample,
} from '../utils/googleFontCatalogSampleText';
import { Tooltip } from '../components/ui/Tooltip';
import { EditorTabBar, EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useFontLibraries } from '../hooks/useFontLibraries';
import { LibraryAuthProvider } from '../contexts/LibraryAuthContext';
import { getMaxSavedLibrariesForUser } from '../utils/authLibraryLimits';
import { PlansDialog } from '../components/ui/PlansDialog';
import { areIdOrdersEqual, moveItemById, orderItemsByIdList } from '../utils/arrayOrder';
import {
  getFontIdsToRemoveWhenLibraryDeleted,
  getLibrarySourceLabel,
  isLibraryFontRecentlyAdded,
  normalizeLibraryText,
  sanitizeLibraryFont,
  stampLibraryFontAddedNow,
} from '../utils/fontLibraryUtils';
import { revokeObjectURL } from '../utils/localFontProcessor';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';
import { readFontsourceCatalogCache } from '../utils/fontsourceCatalogCache';
import { formatCatalogAvailabilityShort, getCatalogUnionStats } from '../utils/catalogUnionStats';
import {
  notifyFontAlreadyInLibrary,
  notifyFontMovedToLibrary,
} from '../components/ui/FontLibraryToastNotifications';
import { readLibraryFontDragData } from '../utils/libraryDragData';
import { useLibraryEntryPrefetch } from '../hooks/useLibraryEntryPrefetch';
import {
  buildSavedLibraryDownloadSplitButtonProps,
  countDownloadableSavedLibraryFonts,
  downloadSelectedSavedLibraryFonts,
  downloadSelectedSavedLibraryFontsAsFormat,
} from '../utils/savedLibraryFontDownload';
import { formatFontVariationSettings } from '../utils/fontVariationSettings';
import { OpenExternalIcon, ShareIcon, TrashIcon, SearchIcon, PlusIcon } from '../components/ui/CommonIcons';
import { IconCircleButton } from '../components/ui/IconCircleButton';
import { LibraryShareDialog } from '../components/ui/LibraryShareDialog';
import { SearchClearButton } from '../components/ui/SearchClearButton';
import { matchesSearch } from '../utils/searchMatching';
import { buildCatalogDownloadButtonProps } from '../components/catalog/buildCatalogDownloadButtonProps';
import { moveAndSwapIconUrl } from '../components/ui/editIconUrls';
import { isInteractiveTarget } from '../utils/dom/isInteractiveTarget';
import { LibraryMoveMenu } from '../components/library/LibraryMoveMenu';
import { FontsLibraryHomeScreen } from '../components/library/FontsLibraryHomeScreen';
import { buildGroupedFontSubsetOptions } from '../utils/fontSubsetLabels';
import {
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
} from '../utils/catalogDownloadActions';
import CatalogSessionAddSpinner from '../components/ui/CatalogSessionAddSpinner';
import { useStickyTimedSet } from '../components/ui/useStickyTimedSet';
import { useLongPressMultiSelect } from '../components/ui/useLongPressMultiSelect';
import { SelectionToolbarActions } from '../components/library/SelectionToolbarActions';
import {
  EDITOR_MAIN_TAB_LS_KEY,
  EDITOR_EMPTY_SLOTS_LS_KEY,
  EDITOR_CLOSED_LIBRARY_FONT_IDS_LS_KEY,
  FONTS_LIBRARY_INNER_TAB_LS_KEY,
  SESSION_FONT_ORDER_LS_KEY,
  EDITOR_MAIN_TAB_PENDING,
  newEmptySlotId,
  isFontTabId,
} from '../utils/editorShellStorage';
import { SAVED_LIBRARY_TAB_PREFIX, makeSavedLibraryTabId, readSavedLibraryId } from '../utils/savedLibraryTabIds';
import { useEditorShellPersistence } from '../hooks/useEditorShellPersistence';
import { editorShellDbg } from '../utils/editorShellDebugLog';
import { usePerFontPreviewPersistence } from '../hooks/usePerFontPreviewPersistence';
import { useFontsourcePreviewPrewarm } from '../hooks/useFontsourcePreviewPrewarm';
import { useSessionFontTabsPreviewCache } from '../hooks/useSessionFontTabsPreviewCache';
import {
  LIBRARY_MAIN_TABS,
} from '../constants/fontsLibraryScreen';
import { countFontsByScope, buildScopeSelectOptions } from '../utils/fontLibraryScopeUi';

export default function Home() {
  const router = useRouter();

  /** Старые ссылки `/?share=` ведём на отдельную страницу предпросмотра. */
  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.share;
    const share = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
    if (!share) return;
    void router.replace({ pathname: '/share', query: { share } });
  }, [router.isReady, router.query.share, router]);

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
  const [liveWaterfallBaseSize, setLiveWaterfallBaseSize] = useState(null);
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
  const [savedLibrarySearchQuery, setSavedLibrarySearchQuery] = useState('');
  const [savedLibraryFilterSubsets, setSavedLibraryFilterSubsets] = useState([]);
  const [savedLibraryFilterVariable, setSavedLibraryFilterVariable] = useState('all'); // all | variable | static
  const [savedLibraryFilterItalic, setSavedLibraryFilterItalic] = useState(false);
  const [isSavedLibrarySearchExpanded, setIsSavedLibrarySearchExpanded] = useState(false);
  const [savedLibraryCatalogSearchSource, setSavedLibraryCatalogSearchSource] = useState('google'); // google | fontsource
  const [savedLibraryToolbarViewportW, setSavedLibraryToolbarViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const savedLibrarySearchWrapRef = useRef(null);
  const savedLibrarySearchInputRef = useRef(null);
  const openLibraryShareDialogRef = useRef(() => {});
  const [savedLibraryCatalogAddBusyId, setSavedLibraryCatalogAddBusyId] = useState(null);
  const { set: savedLibraryCatalogRecentlyAddedSet, mark: markSavedLibraryCatalogRecentlyAdded } =
    useStickyTimedSet(900);
  const [fileUploadTarget, setFileUploadTarget] = useState('editor');
  const [createLibrarySeedRequest, setCreateLibrarySeedRequest] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [plainPreviewOpen, setPlainPreviewOpen] = useState(false);
  const [libraryShareDialogOpen, setLibraryShareDialogOpen] = useState(false);
  const [libraryShareSnapshot, setLibraryShareSnapshot] = useState(null);
  const [libraryShareSeedIds, setLibraryShareSeedIds] = useState([]);
  const [catalogSelectionActions, setCatalogSelectionActions] = useState({
    selectedCount: 0,
    downloadSelected: null,
    downloadSelectedAsFormat: null,
    moveSelected: null,
    createLibraryFromSelection: null,
  });
  const [emptyTabSelectionActions, setEmptyTabSelectionActions] = useState({
    selectedCount: 0,
    downloadSelected: null,
    downloadSelectedAsFormat: null,
    moveSelected: null,
    createLibraryFromSelection: null,
  });
  const [isSavedLibraryMoveBusy, setIsSavedLibraryMoveBusy] = useState(false);
  const [savedLibrarySelectionCount, setSavedLibrarySelectionCount] = useState(0);
  const [catalogPreviewSlotsById, setCatalogPreviewSlotsById] = useState({});
  const [libraryDropTargetTabId, setLibraryDropTargetTabId] = useState(null);
  const {
    libraries: fontLibraries,
    createLibrary: createFontLibrary,
    updateLibrary: updateFontLibrary,
    deleteLibrary: deleteFontLibrary,
    reorderLibraries: reorderFontLibraries,
    reorderLibraryFonts,
    clearAllLibraries,
  } = useFontLibraries();

  const { data: session, status: authStatus } = useSession();
  const needsLink = session?.user?.needsLink === true;

  useEffect(() => {
    if (authStatus !== 'unauthenticated') return;
    clearAllLibraries();
    setFontsLibraryTab('catalog');
  }, [authStatus, clearAllLibraries]);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const openPlans = useCallback(() => setIsPlansOpen(true), []);

  const requestSignIn = useCallback(() => {
    if (typeof window === 'undefined') return;
    const callbackUrl = `${window.location.pathname}${window.location.search || ''}`;
    void signIn(undefined, { callbackUrl });
  }, []);

  useEffect(() => {
    if (!needsLink) return;
    if (typeof window === 'undefined') return;
    toast.info('Подтвердите привязку аккаунта');
    void router.push('/auth/link');
  }, [needsLink, router]);

  const assertCanCreateNewLibrary = useCallback(() => {
    if (authStatus === 'loading') {
      toast.info('Проверка входа…');
      return false;
    }
    if (authStatus !== 'authenticated') {
      toast.info('Войдите, чтобы создавать библиотеки');
      requestSignIn();
      return false;
    }
    if (needsLink) {
      toast.info('Подтвердите привязку аккаунта');
      void router.push('/auth/link');
      return false;
    }
    if (session?.user?.canCreateLibraries === false) {
      toast.info(session.user.canCreateLibrariesReason || 'Действие недоступно для нового аккаунта');
      return false;
    }
    const maxLibs = getMaxSavedLibrariesForUser(Boolean(session?.user?.isPro));
    if (fontLibraries.length >= maxLibs) {
      toast.info('Лимит библиотек достигнут. Посмотрите планы, чтобы получить больше возможностей.');
      openPlans();
      return false;
    }
    return true;
  }, [
    authStatus,
    fontLibraries.length,
    requestSignIn,
    session?.user?.canCreateLibraries,
    session?.user?.canCreateLibrariesReason,
    session?.user?.isPro,
    needsLink,
    router,
    openPlans,
  ]);

  const libraryAuthValue = useMemo(() => {
    const isPro = Boolean(session?.user?.isPro);
    const maxLibs = getMaxSavedLibrariesForUser(isPro);
    return {
      authLoading: authStatus === 'loading',
      isAuthenticated: authStatus === 'authenticated',
      isPro,
      planName: session?.user?.plan === 'pro' ? 'Pro' : 'Free',
      librariesCount: fontLibraries.length,
      librariesLimit: maxLibs,
      canCreateNewLibrary:
        authStatus === 'authenticated' &&
        !needsLink &&
        session?.user?.canCreateLibraries !== false &&
        fontLibraries.length < maxLibs,
      requestSignIn,
      openPlans,
      assertCanCreateNewLibrary,
    };
  }, [
      authStatus,
      fontLibraries.length,
      requestSignIn,
      assertCanCreateNewLibrary,
      session?.user?.canCreateLibraries,
      session?.user?.isPro,
      session?.user?.plan,
      needsLink,
      openPlans,
    ],
  );

  // Используем хук useFontContext вместо useFontManager
  const {
    fonts,
    selectedFont,
    variableSettings,
    handleFontsUploaded,
    handleVariableSettingsChange,
    safeSelectFont,
    removeFont,
    removeFontsByIds,
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
  const catalogPreviewSlotsByIdRef = useRef(catalogPreviewSlotsById);
  catalogPreviewSlotsByIdRef.current = catalogPreviewSlotsById;
  const initialSessionFontOrderIdsRef = useRef([]);
  const hasAppliedInitialSessionFontOrderRef = useRef(false);

  const hasRestoredEditorMainTab = useEditorShellPersistence({
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
  });

  useFontsourcePreviewPrewarm({ hasRestoredEditorMainTab });

  usePerFontPreviewPersistence({
    hasRestoredEditorMainTab,
    isInitialLoadComplete,
    mainTab,
    fonts,
    setFonts,
    previewSettingsValuesRef,
    previewSettersRef,
    getDefaultPreviewSettingsSnapshot,
    previewSettingsDeps: [
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
    ],
  });

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

  const savedLibrarySearchQueryTrimmed = savedLibrarySearchQuery.trim();
  const savedLibrarySearchActive =
    isSavedLibrarySearchExpanded || savedLibrarySearchQueryTrimmed.length > 0;
  const savedLibraryToolbarIs2Col = savedLibraryToolbarViewportW < 768;
  const savedLibraryToolbarIs4Col = savedLibraryToolbarViewportW >= 768 && savedLibraryToolbarViewportW < 1280;
  const savedLibraryToolbarIs5Col = savedLibraryToolbarViewportW >= 1280 && savedLibraryToolbarViewportW <= 1440;
  const savedLibraryToolbarIsWideRow = savedLibraryToolbarViewportW >= 1280;
  const savedLibraryToolbarIsTightResetGap =
    savedLibraryToolbarViewportW >= 1280 && savedLibraryToolbarViewportW <= 1500;
  const savedLibraryHideDownloadLabel =
    savedLibraryToolbarViewportW <= 1440 && savedLibraryToolbarViewportW >= 1024;
  const savedLibrarySearchOverlayEnabled = savedLibraryToolbarViewportW <= 1920;
  const savedLibraryResetLabel =
    savedLibraryToolbarViewportW > 1440 ? 'Сбросить все' : 'Сбросить';
  const catalogSourceToggleTightGap =
    savedLibraryToolbarViewportW <= 1480 && savedLibraryToolbarViewportW >= 1440;
  const catalogSourceToggleClassName = `w-full max-w-none ${
    catalogSourceToggleTightGap ? 'gap-1' : 'gap-4'
  } [&>button]:w-auto [&>button]:flex-1`;

  const savedLibrarySourceToggleValue = savedLibraryCatalogSearchSource;
  const savedLibrarySourceToggleOptions = useMemo(
    () => [
      { value: 'google', label: 'Google' },
      { value: 'fontsource', label: 'Fontsource' },
    ],
    [],
  );

  const clearSavedLibrarySearch = useCallback(() => {
    setSavedLibrarySearchQuery('');
    setIsSavedLibrarySearchExpanded(false);
    savedLibrarySearchInputRef.current?.blur();
  }, []);

  /** Только строка поиска; панель поиска остаётся открытой (крестик внутри поля). */
  const clearSavedLibrarySearchTextOnly = useCallback(() => {
    setSavedLibrarySearchQuery('');
  }, []);

  const openSavedLibrarySearch = useCallback(() => {
    setIsSavedLibrarySearchExpanded(true);
    requestAnimationFrame(() => {
      savedLibrarySearchInputRef.current?.focus();
    });
  }, []);

  const handleSavedLibrarySearchBlur = useCallback(
    (event) => {
      const nextFocusedElement = event.relatedTarget;
      if (
        nextFocusedElement &&
        savedLibrarySearchWrapRef.current instanceof HTMLElement &&
        savedLibrarySearchWrapRef.current.contains(nextFocusedElement)
      ) {
        return;
      }
      if (!savedLibrarySearchQuery.trim()) {
        setIsSavedLibrarySearchExpanded(false);
      }
    },
    [savedLibrarySearchQuery],
  );

  const savedLibraryCatalogLookup = useMemo(() => {
    const googleByFamily = new Map();
    const fontsourceBySlug = new Map();

    const google = readGoogleFontCatalogCache();
    (Array.isArray(google) ? google : []).forEach((entry) => {
      const family = String(entry?.family || '').trim();
      if (!family) return;
      googleByFamily.set(family.toLowerCase(), entry);
    });

    const fontsource = readFontsourceCatalogCache();
    (Array.isArray(fontsource) ? fontsource : []).forEach((item) => {
      const slug = String(item?.id || item?.slug || '').trim();
      if (!slug) return;
      fontsourceBySlug.set(slug, item);
    });

    return { googleByFamily, fontsourceBySlug };
  }, [
    activeSavedLibrary,
    savedLibraryCatalogSearchSource,
    savedLibraryFilterItalic,
    savedLibraryFilterSubsets,
    savedLibraryFilterVariable,
    savedLibrarySearchQueryTrimmed,
  ]);

  const availableSavedLibrarySubsets = useMemo(() => {
    if (!activeSavedLibrary) return [];
    const set = new Set();
    (Array.isArray(activeSavedLibrary.fonts) ? activeSavedLibrary.fonts : []).forEach((font) => {
      const id = String(font?.id || '');
      const label = String(font?.label || '');
      const source = String(font?.source || 'editor');
      if (source === 'google') {
        const family = id.startsWith('google:') ? id.slice('google:'.length) : label;
        const meta = savedLibraryCatalogLookup.googleByFamily.get(String(family || '').toLowerCase());
        (Array.isArray(meta?.subsets) ? meta.subsets : []).forEach((subset) => set.add(String(subset)));
      } else if (source === 'fontsource') {
        const slug = id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
        const meta = savedLibraryCatalogLookup.fontsourceBySlug.get(slug);
        (Array.isArray(meta?.subsets) ? meta.subsets : []).forEach((subset) => set.add(String(subset)));
      }
    });
    return Array.from(set);
  }, [activeSavedLibrary, savedLibraryCatalogLookup]);

  const savedLibrarySubsetOptions = useMemo(
    () =>
      buildGroupedFontSubsetOptions(availableSavedLibrarySubsets, savedLibraryFilterSubsets, {
        includeSelectedSection: false,
      }),
    [availableSavedLibrarySubsets, savedLibraryFilterSubsets],
  );

  const savedLibraryVariableOptions = useMemo(
    () => [
      { value: 'variable', label: 'Вариативные' },
      { value: 'static', label: 'Статические' },
    ],
    [],
  );

  const savedLibraryHasAdvancedFilters =
    (Array.isArray(savedLibraryFilterSubsets) && savedLibraryFilterSubsets.length > 0) ||
    String(savedLibraryFilterVariable || 'all') !== 'all' ||
    savedLibraryFilterItalic === true;

  const resetSavedLibraryFilters = useCallback(() => {
    setSavedLibraryFontsScope('all');
    setSavedLibrarySearchQuery('');
    setIsSavedLibrarySearchExpanded(false);
    setSavedLibraryFilterSubsets([]);
    setSavedLibraryFilterVariable('all');
    setSavedLibraryFilterItalic(false);
    savedLibrarySearchInputRef.current?.blur();
  }, []);

  const savedLibraryCardMetaClassName = 'mt-auto pt-1 text-xs font-semibold uppercase text-gray-800';

  const buildSavedLibraryCardMetaParts = useCallback(
    (font, sessionFont = null) => {
      const id = String(font?.id || '');
      const label = String(font?.label || '');
      const source = String(font?.source || 'session');
      const sourceLabel = String(getLibrarySourceLabel(source) || source).toUpperCase();

      let isVariable = font?.isVariable === true;
      let hasItalic = false;

      if (source === 'google') {
        const family = id.startsWith('google:') ? id.slice('google:'.length) : label;
        const meta = savedLibraryCatalogLookup.googleByFamily.get(String(family || '').toLowerCase());
        isVariable = isVariable || (Array.isArray(meta?.axes) && meta.axes.length > 0);
        hasItalic =
          meta?.hasItalicStyles === true ||
          (typeof meta?.italicMode === 'string' && meta.italicMode && meta.italicMode !== 'none');
      } else if (source === 'fontsource') {
        const slug = id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
        const meta = savedLibraryCatalogLookup.fontsourceBySlug.get(slug);
        isVariable = isVariable || meta?.isVariable === true;
        hasItalic = meta?.hasItalic === true;
      }

      if (!isVariable && sessionFont) {
        isVariable =
          sessionFont?.isVariable === true ||
          (Array.isArray(sessionFont?.variableAxes) && sessionFont.variableAxes.length > 0) ||
          (Array.isArray(sessionFont?.axes) && sessionFont.axes.length > 0);
      }

      if (!hasItalic && sessionFont) {
        const styleToken = [
          sessionFont?.selectedStyle,
          sessionFont?.style,
          sessionFont?.activeStyle?.name,
          sessionFont?.originalName,
          sessionFont?.name,
        ]
          .map((part) => String(part || ''))
          .join(' ');
        hasItalic = /italic/i.test(styleToken);
      }

      const parts = [sourceLabel];
      if (isVariable) parts.push('VF');
      if (hasItalic) parts.push('ITALIC');
      return parts;
    },
    [savedLibraryCatalogLookup],
  );

  const filteredActiveSavedLibraryFonts = useMemo(() => {
    if (!activeSavedLibrary) return [];
    const scoped =
      savedLibraryFontsScope === 'all'
        ? activeSavedLibrary.fonts
        : savedLibraryFontsScope === 'recent'
          ? activeSavedLibrary.fonts.filter((font) => isLibraryFontRecentlyAdded(font))
          : activeSavedLibrary.fonts.filter(
              (font) => (font?.source || 'editor') === savedLibraryFontsScope,
            );
    const searchFiltered = !savedLibrarySearchQueryTrimmed
      ? scoped
      : scoped.filter((font) =>
          matchesSearch([String(font?.label || ''), String(font?.id || '')], savedLibrarySearchQueryTrimmed),
        );

    const subsetsActive = Array.isArray(savedLibraryFilterSubsets) && savedLibraryFilterSubsets.length > 0;
    const variableMode = String(savedLibraryFilterVariable || 'all');
    const italicOnly = savedLibraryFilterItalic === true;

    if (!subsetsActive && variableMode === 'all' && !italicOnly) return searchFiltered;

    const selectedSubsetSet = subsetsActive
      ? new Set(savedLibraryFilterSubsets.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean))
      : null;

    return searchFiltered.filter((font) => {
      const id = String(font?.id || '');
      const label = String(font?.label || '');
      const source = String(font?.source || 'editor');

      let subsets = [];
      let isVariable = false;
      let hasItalic = false;

      if (source === 'google') {
        const family = id.startsWith('google:') ? id.slice('google:'.length) : label;
        const meta = savedLibraryCatalogLookup.googleByFamily.get(String(family || '').toLowerCase());
        subsets = Array.isArray(meta?.subsets) ? meta.subsets : [];
        isVariable = Array.isArray(meta?.axes) && meta.axes.length > 0;
        hasItalic =
          meta?.hasItalicStyles === true ||
          (typeof meta?.italicMode === 'string' && meta.italicMode && meta.italicMode !== 'none');
      } else if (source === 'fontsource') {
        const slug = id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
        const meta = savedLibraryCatalogLookup.fontsourceBySlug.get(slug);
        subsets = Array.isArray(meta?.subsets) ? meta.subsets : [];
        isVariable = meta?.isVariable === true;
        hasItalic = meta?.hasItalic === true;
      }

      if (selectedSubsetSet) {
        const fontSubsetSet = new Set(subsets.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean));
        let matchesAny = false;
        for (const subset of selectedSubsetSet) {
          if (fontSubsetSet.has(subset)) {
            matchesAny = true;
            break;
          }
        }
        if (!matchesAny) return false;
      }

      if (variableMode === 'variable' && !isVariable) return false;
      if (variableMode === 'static' && isVariable) return false;
      if (italicOnly && !hasItalic) return false;

      return true;
    });
  }, [
    activeSavedLibrary,
    savedLibraryCatalogLookup,
    savedLibraryFilterItalic,
    savedLibraryFilterSubsets,
    savedLibraryFilterVariable,
    savedLibraryFontsScope,
    savedLibrarySearchQueryTrimmed,
  ]);

  const catalogSearchResults = useMemo(() => {
    if (!savedLibrarySearchQueryTrimmed) return [];
    const query = savedLibrarySearchQueryTrimmed;
    const libraryFontIds = new Set((activeSavedLibrary?.fonts || []).map((f) => String(f?.id || '').trim()));

    const out = [];

    if (savedLibraryCatalogSearchSource === 'google') {
      const google = readGoogleFontCatalogCache();
      (Array.isArray(google) ? google : []).forEach((entry) => {
        const family = String(entry?.family || '').trim();
        if (!family) return;
        if (!matchesSearch([family, entry?.category, ...(entry?.subsets || [])], query)) return;
        const libraryId = `google:${family}`;
        const alreadyIn = libraryFontIds.has(libraryId);
        out.push({
          id: `catalog-google:${family}`,
          source: 'google',
          family,
          entry,
          alreadyInLibrary: alreadyIn,
        });
      });
    }

    if (savedLibraryCatalogSearchSource === 'fontsource') {
      const fontsource = readFontsourceCatalogCache();
      (Array.isArray(fontsource) ? fontsource : []).forEach((item) => {
        const slug = String(item?.id || item?.slug || '').trim();
        const family = String(item?.family || item?.label || slug).trim();
        if (!slug || !family) return;
        if (!matchesSearch([family, slug, item?.category, ...(item?.subsets || [])], query)) return;
        const libraryId = `fontsource:${slug}`;
        const alreadyIn = libraryFontIds.has(libraryId);
        out.push({
          id: `catalog-fontsource:${slug}`,
          source: 'fontsource',
          slug,
          family,
          item,
          alreadyInLibrary: alreadyIn,
        });
      });
    }

    return out.slice(0, 60);
  }, [activeSavedLibrary?.fonts, savedLibraryCatalogSearchSource, savedLibrarySearchQueryTrimmed]);

  const activeSavedLibraryScopeCounts = useMemo(
    () => countFontsByScope(activeSavedLibrary?.fonts || []),
    [activeSavedLibrary],
  );
  const activeSavedLibraryScopeOptions = useMemo(
    () => buildScopeSelectOptions(activeSavedLibraryScopeCounts),
    [activeSavedLibraryScopeCounts],
  );
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setSavedLibraryToolbarViewportW(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const savedLibraryShareButton = (
    <Tooltip content="Поделиться">
      <IconCircleButton
        variant="searchToggle"
        size="md"
        className={`focus:outline-none ${
          savedLibrarySelectionCount > 0
            ? '!bg-accent !text-white hover:!bg-accent-hover [&_svg]:!text-white'
            : ''
        }`}
        aria-label="Поделиться"
        onClick={() => openLibraryShareDialogRef.current?.()}
      >
        <ShareIcon className="h-4 w-4" />
      </IconCircleButton>
    </Tooltip>
  );

  const savedLibrarySearchTooltipText = savedLibrarySearchActive ? 'Закрыть поиск' : 'Открыть поиск';
  const renderSavedLibrarySearchToggleButton = (
    triggerClassName,
    onClick,
    ariaLabel = savedLibrarySearchTooltipText,
    pressed = savedLibrarySearchActive,
  ) => (
    <Tooltip content={savedLibrarySearchTooltipText} className={triggerClassName}>
      <IconCircleButton
        variant="searchToggle"
        size="md"
        pressed={pressed}
        className="focus:outline-none"
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {savedLibrarySearchActive ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            className="h-5 w-5"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <SearchIcon className="h-4 w-4" />
        )}
      </IconCircleButton>
    </Tooltip>
  );

  const savedLibrarySearchInlineButton = (
    <div className="flex items-center gap-2">
      {renderSavedLibrarySearchToggleButton(
        '',
        savedLibrarySearchActive ? clearSavedLibrarySearch : openSavedLibrarySearch,
      )}
      {savedLibraryShareButton}
    </div>
  );

  const savedLibrarySourceButtonBaseClass =
    'flex min-h-10 w-full min-w-0 items-center justify-center rounded-full border px-3 py-1.5 text-center text-sm uppercase font-semibold transition-colors';

  const savedLibrarySearchDesktopControls = savedLibraryToolbarIs5Col ? (
    <div ref={savedLibrarySearchWrapRef} className="grid w-full min-w-0 grid-cols-4 gap-4">
      {savedLibrarySearchActive ? (
        <button
          type="button"
          aria-pressed={savedLibraryCatalogSearchSource === 'google'}
          className={`${savedLibrarySourceButtonBaseClass} ${
            savedLibraryCatalogSearchSource === 'google'
              ? 'border-accent bg-accent text-white'
              : 'border-gray-200 bg-white text-gray-900 hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9]'
          }`}
          onClick={() => setSavedLibraryCatalogSearchSource('google')}
        >
          Google
        </button>
      ) : (
        <div className="min-w-0" />
      )}
      {savedLibrarySearchActive ? (
        <button
          type="button"
          aria-pressed={savedLibraryCatalogSearchSource === 'fontsource'}
          className={`${savedLibrarySourceButtonBaseClass} ${
            savedLibraryCatalogSearchSource === 'fontsource'
              ? 'border-accent bg-accent text-white'
              : 'border-gray-200 bg-white text-gray-900 hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9]'
          }`}
          onClick={() => setSavedLibraryCatalogSearchSource('fontsource')}
        >
          Fontsource
        </button>
      ) : (
        <div className="min-w-0" />
      )}
      <div className="col-span-2 relative min-w-0 pr-24">
        <div
          className={`min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
            savedLibrarySearchActive ? 'opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          <div className="relative">
            <input
              ref={savedLibrarySearchInputRef}
              type="search"
              value={savedLibrarySearchQuery}
              onFocus={() => setIsSavedLibrarySearchExpanded(true)}
              onBlur={handleSavedLibrarySearchBlur}
              onChange={(event) => setSavedLibrarySearchQuery(event.target.value)}
              placeholder="Поиск в библиотеке"
              className="box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 focus:border-black/[0.14] focus:outline-none sm:pl-3"
              autoComplete="off"
              spellCheck={false}
            />
            {savedLibrarySearchQueryTrimmed ? (
              <SearchClearButton
                onClick={clearSavedLibrarySearchTextOnly}
                ariaLabel="Очистить текст поиска"
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            ) : null}
          </div>
        </div>
        {renderSavedLibrarySearchToggleButton(
          'absolute right-12 top-1/2 z-10 -translate-y-1/2',
          savedLibrarySearchActive ? clearSavedLibrarySearch : openSavedLibrarySearch,
        )}
        <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">{savedLibraryShareButton}</div>
      </div>
    </div>
  ) : (
    <div ref={savedLibrarySearchWrapRef} className="grid w-full min-w-0 grid-cols-4 gap-4">
      <div className="min-w-0">
        {savedLibrarySearchActive ? (
          <SegmentedControl
            value={savedLibrarySourceToggleValue}
            onChange={(next) => setSavedLibraryCatalogSearchSource(next)}
            options={savedLibrarySourceToggleOptions}
            variant="pairOutline"
            className="w-full max-w-none gap-0 [&>button]:h-10 [&>button]:flex-1"
          />
        ) : null}
      </div>
      <div className="col-span-3 relative min-w-0 pr-24">
        <div
          className={`min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
            savedLibrarySearchActive ? 'opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          <div className="relative">
            <input
              ref={savedLibrarySearchInputRef}
              type="search"
              value={savedLibrarySearchQuery}
              onFocus={() => setIsSavedLibrarySearchExpanded(true)}
              onBlur={handleSavedLibrarySearchBlur}
              onChange={(event) => setSavedLibrarySearchQuery(event.target.value)}
              placeholder="Поиск в библиотеке"
              className="box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 focus:border-black/[0.14] focus:outline-none sm:pl-3"
              autoComplete="off"
              spellCheck={false}
            />
            {savedLibrarySearchQueryTrimmed ? (
              <SearchClearButton
                onClick={clearSavedLibrarySearchTextOnly}
                ariaLabel="Очистить текст поиска"
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            ) : null}
          </div>
        </div>
        {renderSavedLibrarySearchToggleButton(
          'absolute right-12 top-1/2 z-10 -translate-y-1/2',
          savedLibrarySearchActive ? clearSavedLibrarySearch : openSavedLibrarySearch,
        )}
        <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">{savedLibraryShareButton}</div>
      </div>
    </div>
  );

  const savedLibrarySearchMobileExpandedControls = (
    <div
      ref={savedLibrarySearchWrapRef}
      className={`absolute inset-0 z-20 flex min-w-0 items-center transition-opacity duration-200 ${
        savedLibraryToolbarIs5Col ? '' : 'bg-white'
      } ${
        savedLibrarySearchActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {savedLibraryToolbarIs5Col ? (
        <div className="grid w-full max-w-full grid-cols-5 grid-rows-1 items-center gap-4">
          <div className="col-start-1 row-start-1 min-w-0" />
          <div className="col-start-2 col-span-4 row-start-1 h-10 rounded-md bg-white" aria-hidden />
          <button
            type="button"
            aria-pressed={savedLibraryCatalogSearchSource === 'google'}
            className={`${savedLibrarySourceButtonBaseClass} col-start-2 row-start-1 ${
              savedLibraryCatalogSearchSource === 'google'
                ? 'border-accent bg-accent text-white'
                : 'border-gray-200 bg-white text-gray-900 hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9]'
            }`}
            onClick={() => setSavedLibraryCatalogSearchSource('google')}
          >
            Google
          </button>
          <button
            type="button"
            aria-pressed={savedLibraryCatalogSearchSource === 'fontsource'}
            className={`${savedLibrarySourceButtonBaseClass} col-start-3 row-start-1 ${
              savedLibraryCatalogSearchSource === 'fontsource'
                ? 'border-accent bg-accent text-white'
                : 'border-gray-200 bg-white text-gray-900 hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9]'
            }`}
            onClick={() => setSavedLibraryCatalogSearchSource('fontsource')}
          >
            Fontsource
          </button>
          <div className="relative col-start-4 col-span-2 row-start-1 min-w-0 pr-24">
            <div className="relative">
              <input
                ref={savedLibrarySearchInputRef}
                type="search"
                value={savedLibrarySearchQuery}
                onFocus={() => setIsSavedLibrarySearchExpanded(true)}
                onBlur={handleSavedLibrarySearchBlur}
                onChange={(event) => setSavedLibrarySearchQuery(event.target.value)}
                placeholder="Поиск в библиотеке"
                className="box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 focus:border-black/[0.14] focus:outline-none sm:pl-3"
                autoComplete="off"
                spellCheck={false}
              />
              {savedLibrarySearchQueryTrimmed ? (
                <SearchClearButton
                  onClick={clearSavedLibrarySearchTextOnly}
                  ariaLabel="Очистить текст поиска"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                />
              ) : null}
            </div>
            {renderSavedLibrarySearchToggleButton(
              'absolute right-12 top-1/2 z-10 -translate-y-1/2',
              clearSavedLibrarySearch,
              'Закрыть поиск',
              true,
            )}
            <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">{savedLibraryShareButton}</div>
          </div>
        </div>
      ) : (
        <div
          className={`grid w-full max-w-full gap-4 ${savedLibraryToolbarIs4Col ? 'grid-cols-4' : 'grid-cols-2'}`}
        >
          <div className={savedLibraryToolbarIs4Col ? 'col-span-2 min-w-0' : 'min-w-0'}>
            <SegmentedControl
              value={savedLibrarySourceToggleValue}
              onChange={(next) => setSavedLibraryCatalogSearchSource(next)}
              options={savedLibrarySourceToggleOptions}
              variant="pairOutline"
              className="w-full max-w-none gap-0 [&>button]:h-10 [&>button]:flex-1"
            />
          </div>
          <div className={`${savedLibraryToolbarIs4Col ? 'col-span-2' : ''} relative min-w-0 pr-24`}>
            <div
              className={`min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
                savedLibrarySearchActive ? 'flex-1 opacity-100' : 'max-w-0 opacity-0'
              }`}
            >
              <div className="relative">
                <input
                  ref={savedLibrarySearchInputRef}
                  type="search"
                  value={savedLibrarySearchQuery}
                  onFocus={() => setIsSavedLibrarySearchExpanded(true)}
                  onBlur={handleSavedLibrarySearchBlur}
                  onChange={(event) => setSavedLibrarySearchQuery(event.target.value)}
                  placeholder="Поиск в библиотеке"
                  className="box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 focus:border-black/[0.14] focus:outline-none sm:pl-3"
                  autoComplete="off"
                  spellCheck={false}
                />
                {savedLibrarySearchQueryTrimmed ? (
                  <SearchClearButton
                    onClick={clearSavedLibrarySearchTextOnly}
                    ariaLabel="Очистить текст поиска"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  />
                ) : null}
              </div>
            </div>
            {renderSavedLibrarySearchToggleButton(
              'absolute right-12 top-1/2 z-10 -translate-y-1/2',
              clearSavedLibrarySearch,
              'Закрыть поиск',
              true,
            )}
            <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2">{savedLibraryShareButton}</div>
          </div>
        </div>
      )}
    </div>
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
    const bySourceLabel = new Map();
    fonts.forEach((font) => {
      const keys = [font.displayName, font.name].filter(Boolean);
      const source = String(font?.source || '').trim();
      const originKey = String(font?.originKey || '').trim();
      keys.forEach((key) => {
        const normalizedKey = String(key).toLowerCase();
        byLabel.set(normalizedKey, font);
        if (source) {
          bySourceLabel.set(`${source}:${normalizedKey}`, font);
        }
      });
      if (originKey) {
        byLibraryEntryId.set(originKey, font);
      }
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
    return { byLabel, byLibraryEntryId, bySourceLabel };
  }, [fonts]);

  const resolveSessionFontForLibraryEntry = useCallback(
    (entry) => {
      if (!entry) return null;
      const entryId = String(entry.id || '').trim();
      const entryLabel = String(entry.label || '').trim().toLowerCase();
      const entrySource = String(entry.source || 'editor').trim();

      const byExactEntry =
        sessionFontLookup.byLibraryEntryId.get(entryId) ||
        sessionFontLookup.bySourceLabel.get(`${entrySource}:${entryLabel}`) ||
        null;
      if (byExactEntry) return byExactEntry;

      if (entrySource === 'fontsource' || entrySource === 'google') {
        return null;
      }

      return sessionFontLookup.byLabel.get(entryLabel) || null;
    },
    [sessionFontLookup],
  );

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
    let editorUiReady = null;
    let showNewFallback = null;
    if (typeof document !== 'undefined') {
      editorUiReady = document.documentElement.dataset.editorUiReady ?? null;
      showNewFallback = document.documentElement.dataset.editorShowNewFallback ?? null;
    }
    const tabbarBranch = mainTab === EDITOR_MAIN_TAB_PENDING ? 'skeleton' : 'EditorTabBar';
    editorShellDbg('index: UI shell / таббар', {
      mainTab,
      hasRestoredEditorMainTab,
      isInitialLoadComplete,
      tabbarBranch,
      editorUiReady,
      editorShowNewFallback: showNewFallback,
      emptySlots: emptySlotIds.length,
      fontsVisibleTabBar: fontsVisibleInTabBar.length,
      placeholdersCount: Array.isArray(fontTabPlaceholders) ? fontTabPlaceholders.length : 0,
    });
  }, [
    mainTab,
    hasRestoredEditorMainTab,
    isInitialLoadComplete,
    emptySlotIds.length,
    fontsVisibleInTabBar.length,
    fontTabPlaceholders,
  ]);

  useSessionFontTabsPreviewCache({
    isInitialLoadComplete,
    fontsVisibleInTabBar,
    setTabStripPreviewFromCache,
  });

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

  /** Открытие шрифта из страницы `/share` (query после перехода снимаем). */
  useEffect(() => {
    if (!router.isReady) return;
    const rawG = router.query.openGoogle;
    const rawFs = router.query.openFontsource;
    const family = typeof rawG === 'string' ? rawG.trim() : '';
    const slug = typeof rawFs === 'string' ? rawFs.trim() : '';
    const googleVar =
      router.query.openGoogleVar === '1' ||
      router.query.openGoogleVar === 'true' ||
      router.query.openGoogleVar === true;
    const fsVar =
      router.query.fontsourceVar === '1' ||
      router.query.fontsourceVar === 'true' ||
      router.query.fontsourceVar === true;

    if (!family && !slug) return;

    let cancelled = false;

    const stripOpenQuery = async () => {
      const nextQuery = { ...router.query };
      delete nextQuery.openGoogle;
      delete nextQuery.openGoogleVar;
      delete nextQuery.openFontsource;
      delete nextQuery.fontsourceVar;
      const clean = {};
      Object.keys(nextQuery).forEach((k) => {
        const v = nextQuery[k];
        if (v === undefined || v === null) return;
        clean[k] = v;
      });
      await router.replace(
        { pathname: '/', query: Object.keys(clean).length ? clean : {} },
        undefined,
        { shallow: true },
      );
    };

    (async () => {
      try {
        if (family) {
          const list = readGoogleFontCatalogCache();
          const cached = Array.isArray(list)
            ? list.find(
                (item) => String(item?.family || '').trim().toLowerCase() === family.toLowerCase(),
              )
            : null;
          const entry = cached
            ? { ...cached, isVariable: googleVar && cached.isVariable === true ? true : cached.isVariable }
            : { family, subsets: [], isVariable: Boolean(googleVar), styleCount: 0 };
          await openGoogleCatalogEntryInEditorTab(entry);
        } else if (slug) {
          await openFontsourceSlugInEditorTab(slug, fsVar);
        }
      } finally {
        if (!cancelled) {
          await stripOpenQuery();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    router,
    router.isReady,
    router.query.openGoogle,
    router.query.openGoogleVar,
    router.query.openFontsource,
    router.query.fontsourceVar,
    openGoogleCatalogEntryInEditorTab,
    openFontsourceSlugInEditorTab,
  ]);

  const openLibraryFontEntry = useCallback(
    async (fontEntry) => {
      if (!fontEntry) return;
      const entryId = String(fontEntry.id || '').trim();
      const entryLabel = String(fontEntry.label || '').trim();
      const entrySource = String(fontEntry.source || 'editor').trim();
      const sessionFont = resolveSessionFontForLibraryEntry(fontEntry);

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
        await selectOrAddFontsourceFontWithNav(slug, Boolean(fontEntry?.isVariable), { silent: true });
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
      resolveSessionFontForLibraryEntry,
      safeSelectFont,
      selectOrAddFontsourceFontWithNav,
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

  useEffect(() => {
    setLiveWaterfallBaseSize(null);
  }, [mainTab, selectedFont?.id, viewMode, waterfallBaseSize]);

  const handleWaterfallBaseSizeLiveChange = useCallback((nextValue) => {
    setLiveWaterfallBaseSize(nextValue);
  }, []);

  const handleWaterfallBaseSizeCommit = useCallback(
    (nextValue) => {
      setLiveWaterfallBaseSize(nextValue);
      setWaterfallBaseSize(nextValue);
      requestAnimationFrame(() => {
        setLiveWaterfallBaseSize(null);
      });
    },
    [setWaterfallBaseSize],
  );

  /** Параметры лестницы Waterfall для Markdown-экспорта (с учётом «живого» базового размера при перетаскивании). */
  const waterfallExportMeta = useMemo(
    () => ({
      rows: waterfallRows,
      baseSize: liveWaterfallBaseSize ?? waterfallBaseSize,
      unit: waterfallUnit,
      scaleRatio: waterfallScaleRatio,
      editTarget: waterfallEditTarget,
    }),
    [
      waterfallRows,
      liveWaterfallBaseSize,
      waterfallBaseSize,
      waterfallUnit,
      waterfallScaleRatio,
      waterfallEditTarget,
    ],
  );

  const exportModalFontFamily = useMemo(() => {
    const fam = typeof getFontFamily === 'function' ? getFontFamily() : 'sans-serif';
    return fam === 'inherit' ? 'sans-serif' : fam;
  }, [getFontFamily, selectedFont?.id, selectedFont?.fontFamily, selectedFont?.name]);

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
              addedAt: Date.now(),
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

      const variationSettingsStr = formatFontVariationSettings(variableSettings, {
        fallback: 'normal',
        valueFormatter: (tag) => `var(--font-${tag})`,
      });

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
      if (!assertCanCreateNewLibrary()) return null;
      const created = createFontLibrary(draft);
      if (created?.id) {
        setMainTab('library');
        setFontsLibraryTab(makeSavedLibraryTabId(created.id));
      }
      return created;
    },
    [assertCanCreateNewLibrary, createFontLibrary],
  );

  const handleUpdateSavedLibrary = useCallback(
    (libraryId, draft) => updateFontLibrary(libraryId, draft),
    [updateFontLibrary],
  );

  const handleDeleteSavedLibrary = useCallback(
    (libraryId) => {
      const deletedLibrary = fontLibraries.find((library) => library.id === libraryId) || null;
      const remainingLibraries = fontLibraries.filter((library) => library.id !== libraryId);
      const idsToRemove = getFontIdsToRemoveWhenLibraryDeleted(fonts, deletedLibrary, remainingLibraries);

      deleteFontLibrary(libraryId);
      setFontsLibraryTab((prev) => (prev === makeSavedLibraryTabId(libraryId) ? 'catalog' : prev));

      if (idsToRemove.length === 0) return;

      const removedSet = new Set(idsToRemove.map((id) => String(id)));
      const remainingAfter = fonts.filter((font) => !removedSet.has(String(font.id)));

      removeFontsByIds(idsToRemove);
      setClosedLibraryFontIds((prev) => prev.filter((id) => !removedSet.has(String(id))));

      if (removedSet.has(String(mainTab))) {
        const nextVisible =
          remainingAfter.find((font) => !closedLibraryFontIds.includes(font.id)) || null;
        if (nextVisible) {
          setMainTab(nextVisible.id);
          if (String(selectedFont?.id) !== String(nextVisible.id)) {
            safeSelectFont(nextVisible);
          }
        } else if (emptySlotIds.length > 0) {
          setMainTab(`${EMPTY_PREFIX}${emptySlotIds[0]}`);
          setSelectedFont(null);
        } else {
          setMainTab('library');
          setSelectedFont(null);
        }
      }
    },
    [
      closedLibraryFontIds,
      deleteFontLibrary,
      emptySlotIds,
      fontLibraries,
      fonts,
      mainTab,
      removeFontsByIds,
      safeSelectFont,
      selectedFont,
      setClosedLibraryFontIds,
      setMainTab,
      setSelectedFont,
    ],
  );

  const handleMoveLibraryFont = useCallback(
    (libraryId, draggedFontId, targetFontId) => {
      reorderLibraryFonts(libraryId, draggedFontId, targetFontId);
    },
    [reorderLibraryFonts],
  );

  const prefetchLibraryEntry = useLibraryEntryPrefetch();

  const addFontEntryToLibrary = useCallback(
    (libraryId, fontEntry) => {
      const entry = stampLibraryFontAddedNow(fontEntry);
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
      prefetchLibraryEntry(entry);
      return true;
    },
    [fontLibraries, handleUpdateSavedLibrary, prefetchLibraryEntry],
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
      const movedEntry = stampLibraryFontAddedNow(canonicalEntry) || canonicalEntry;

      if (currentlyIn.length === 1 && currentlyIn[0].id === targetLibrary.id) {
        toast.info(`Шрифт «${canonicalEntry.label}» уже в библиотеке «${targetLibrary.name}»`);
        return;
      }

      fontLibraries.forEach((library) => {
        const fontsWithoutEntry = (Array.isArray(library.fonts) ? library.fonts : []).filter(
          (item) => !matchesEntry(item),
        );
        const nextFonts =
          library.id === targetLibrary.id ? [...fontsWithoutEntry, movedEntry] : fontsWithoutEntry;
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

  const requestCreateLibraryWithFonts = useCallback(
    (selectedFonts) => {
      if (!assertCanCreateNewLibrary()) return;
      setCreateLibrarySeedRequest({
        requestId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `library-seed:${Date.now()}`,
        selectedFonts: (Array.isArray(selectedFonts) ? selectedFonts : []).filter(Boolean),
      });
    },
    [assertCanCreateNewLibrary],
  );

  const handleCatalogSelectionActionsChange = useCallback((nextActions) => {
    if (!nextActions || typeof nextActions !== 'object') {
      setCatalogSelectionActions({
        selectedCount: 0,
        downloadSelected: null,
        downloadSelectedAsFormat: null,
        moveSelected: null,
        createLibraryFromSelection: null,
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
      moveSelected:
        typeof nextActions.moveSelected === 'function' ? nextActions.moveSelected : null,
      createLibraryFromSelection:
        typeof nextActions.createLibraryFromSelection === 'function'
          ? nextActions.createLibraryFromSelection
          : null,
    });
  }, []);
  const handleEmptyTabSelectionActionsChange = useCallback((nextActions) => {
    if (!nextActions || typeof nextActions !== 'object') {
      setEmptyTabSelectionActions({
        selectedCount: 0,
        downloadSelected: null,
        downloadSelectedAsFormat: null,
        moveSelected: null,
        createLibraryFromSelection: null,
      });
      return;
    }
    setEmptyTabSelectionActions({
      selectedCount: Number(nextActions.selectedCount) || 0,
      downloadSelected:
        typeof nextActions.downloadSelected === 'function' ? nextActions.downloadSelected : null,
      downloadSelectedAsFormat:
        typeof nextActions.downloadSelectedAsFormat === 'function'
          ? nextActions.downloadSelectedAsFormat
          : null,
      moveSelected:
        typeof nextActions.moveSelected === 'function' ? nextActions.moveSelected : null,
      createLibraryFromSelection:
        typeof nextActions.createLibraryFromSelection === 'function'
          ? nextActions.createLibraryFromSelection
          : null,
    });
  }, []);

  const {
    selectedKeys: selectedSavedLibraryFontIds,
    setSelectedKeys: setSelectedSavedLibraryFontIds,
    startLongPress: startSavedLibraryCardLongPress,
    onCardClick: onSavedLibrarySelectionCardClick,
    clearLongPressTimer: clearSavedLibraryLongPressTimer,
    pruneSelection: pruneSavedLibrarySelection,
  } = useLongPressMultiSelect({ longPressMs: 220, isInteractiveTarget });

  useEffect(() => {
    setSavedLibrarySelectionCount(selectedSavedLibraryFontIds.size);
  }, [selectedSavedLibraryFontIds]);

  useEffect(() => {
    if (!activeSavedLibrary) {
      setSelectedSavedLibraryFontIds(new Set());
      return;
    }
    pruneSavedLibrarySelection(new Set(filteredActiveSavedLibraryFonts.map((font) => font.id)));
  }, [
    activeSavedLibrary,
    filteredActiveSavedLibraryFonts,
    pruneSavedLibrarySelection,
    setSelectedSavedLibraryFontIds,
  ]);

  const selectedSavedLibraryFonts = useMemo(
    () => filteredActiveSavedLibraryFonts.filter((font) => selectedSavedLibraryFontIds.has(font.id)),
    [filteredActiveSavedLibraryFonts, selectedSavedLibraryFontIds],
  );

  const openLibraryShareDialog = useCallback(
    (libraryId = null, options = {}) => {
      const id = libraryId || activeSavedLibrary?.id;
      const library = fontLibraries.find((l) => l.id === id);
      if (!library?.fonts?.length) {
        toast.info('В этой библиотеке пока нет шрифтов');
        return;
      }
      const onlyFontIds = Array.isArray(options.onlyFontIds)
        ? options.onlyFontIds.map(String).filter(Boolean)
        : null;
      const isActiveContext = id === activeSavedLibrary?.id;
      let seeds;
      if (onlyFontIds && onlyFontIds.length > 0) {
        seeds = onlyFontIds.filter((fid) => library.fonts.some((f) => String(f.id) === String(fid)));
        if (seeds.length === 0) {
          seeds = library.fonts.map((f) => f.id);
        }
      } else if (isActiveContext && selectedSavedLibraryFontIds.size > 0) {
        seeds = [...selectedSavedLibraryFontIds].filter((fid) =>
          library.fonts.some((f) => String(f.id) === String(fid)),
        );
      } else {
        seeds = library.fonts.map((f) => f.id);
      }
      setLibraryShareSnapshot({
        id: library.id,
        name: library.name,
        fonts: Array.isArray(library.fonts) ? [...library.fonts] : [],
      });
      setLibraryShareSeedIds(seeds.map(String));
      setLibraryShareDialogOpen(true);
    },
    [activeSavedLibrary?.id, fontLibraries, selectedSavedLibraryFontIds],
  );
  openLibraryShareDialogRef.current = openLibraryShareDialog;

  const closeLibraryShareDialog = useCallback(() => {
    setLibraryShareDialogOpen(false);
    setLibraryShareSnapshot(null);
    setLibraryShareSeedIds([]);
  }, []);

  const selectedSavedLibraryDownloadableCount = useMemo(
    () => countDownloadableSavedLibraryFonts(selectedSavedLibraryFonts),
    [selectedSavedLibraryFonts],
  );
  const downloadSelectedSavedLibrary = useCallback(
    () => downloadSelectedSavedLibraryFonts(selectedSavedLibraryFonts),
    [selectedSavedLibraryFonts],
  );
  const downloadSelectedSavedLibraryAsFormat = useCallback(
    (format) => downloadSelectedSavedLibraryFontsAsFormat(selectedSavedLibraryFonts, format),
    [selectedSavedLibraryFonts],
  );
  const moveSelectedSavedLibraryFonts = useCallback(
    async (targetLibraryId) => {
      if (!activeSavedLibrary?.id || !targetLibraryId) return false;
      if (targetLibraryId === activeSavedLibrary.id) return false;
      const selectedEntries = filteredActiveSavedLibraryFonts.filter((font) =>
        selectedSavedLibraryFontIds.has(font.id),
      );
      if (selectedEntries.length === 0) return false;

      const normalizedEntries = selectedEntries.map((entry) => sanitizeLibraryFont(entry)).filter(Boolean);
      if (normalizedEntries.length === 0) return false;

      setIsSavedLibraryMoveBusy(true);
      try {
        const targetLibrary = fontLibraries.find((library) => library.id === targetLibraryId);
        if (!targetLibrary) return false;

        const selectedIdSet = new Set(
          normalizedEntries.map((entry) => String(entry.id || '').trim()).filter(Boolean),
        );
        const sourceFonts = (activeSavedLibrary.fonts || []).filter(
          (item) => !selectedIdSet.has(String(item?.id || '').trim()),
        );
        const targetExistingIds = new Set(
          (targetLibrary.fonts || []).map((item) => String(item?.id || '').trim()),
        );
        const movedEntries = normalizedEntries
          .filter((entry) => !targetExistingIds.has(String(entry.id || '').trim()))
          .map((entry) => stampLibraryFontAddedNow(entry) || entry);

        handleUpdateSavedLibrary(activeSavedLibrary.id, { fonts: sourceFonts });
        handleUpdateSavedLibrary(targetLibraryId, {
          fonts: [...targetLibrary.fonts, ...movedEntries],
        });
        setSelectedSavedLibraryFontIds(new Set());
        toast.success(
          movedEntries.length === 1
            ? `Перенесен в «${targetLibrary.name}»`
            : `Перенесено ${movedEntries.length} шрифтов в «${targetLibrary.name}»`,
        );
        return true;
      } finally {
        setIsSavedLibraryMoveBusy(false);
      }
    },
    [
      activeSavedLibrary,
      filteredActiveSavedLibraryFonts,
      fontLibraries,
      handleUpdateSavedLibrary,
      selectedSavedLibraryFontIds,
      setSelectedSavedLibraryFontIds,
    ],
  );

  const moveSingleSavedLibraryFont = useCallback(
    async (fontEntry, targetLibraryId) => {
      if (!activeSavedLibrary?.id || !targetLibraryId) return false;
      if (targetLibraryId === activeSavedLibrary.id) return false;

      const normalizedEntry = sanitizeLibraryFont(fontEntry);
      const movedEntryId = String(normalizedEntry?.id || '').trim();
      if (!normalizedEntry || !movedEntryId) return false;

      setIsSavedLibraryMoveBusy(true);
      try {
        const targetLibrary = fontLibraries.find((library) => library.id === targetLibraryId);
        if (!targetLibrary) return false;

        const sourceFonts = (activeSavedLibrary.fonts || []).filter(
          (item) => String(item?.id || '').trim() !== movedEntryId,
        );
        const targetExistingIds = new Set(
          (targetLibrary.fonts || []).map((item) => String(item?.id || '').trim()),
        );
        const alreadyInTarget = targetExistingIds.has(movedEntryId);

        handleUpdateSavedLibrary(activeSavedLibrary.id, { fonts: sourceFonts });
        if (!alreadyInTarget) {
          handleUpdateSavedLibrary(targetLibraryId, {
            fonts: [...targetLibrary.fonts, stampLibraryFontAddedNow(normalizedEntry) || normalizedEntry],
          });
        }

        setSelectedSavedLibraryFontIds(new Set());
        toast.success(`Перенесен в «${targetLibrary.name}»`);
        return true;
      } finally {
        setIsSavedLibraryMoveBusy(false);
      }
    },
    [activeSavedLibrary, fontLibraries, handleUpdateSavedLibrary, setSelectedSavedLibraryFontIds],
  );

  const activeSavedLibraryItems = useMemo(() => {
    if (!activeSavedLibrary) return [];
    const now = Date.now();
    return filteredActiveSavedLibraryFonts.map((font) => {
      const sessionFont = resolveSessionFontForLibraryEntry(font);
      return {
        id: font.id,
        selected: sessionFont ? mainTab === sessionFont.id : false,
        batchSelected: selectedSavedLibraryFontIds.has(font.id),
        title: font.label,
        recentlyAdded: isLibraryFontRecentlyAdded(font, now),
        subtitleParts: buildSavedLibraryCardMetaParts(font, sessionFont),
        subtitleClassName: savedLibraryCardMetaClassName,
        previewStyle: sessionFont ? sessionCardPreviewStyleFor(sessionFont) : undefined,
        onCardClick: (event) => {
          onSavedLibrarySelectionCardClick(event, font.id);
          if (event?.defaultPrevented || selectedSavedLibraryFontIds.size > 0) return;
          void openLibraryFontEntry(font);
        },
        onPointerDown: (event) => startSavedLibraryCardLongPress(event, font.id),
        onPointerUp: clearSavedLibraryLongPressTimer,
        onPointerLeave: clearSavedLibraryLongPressTimer,
        onPointerCancel: clearSavedLibraryLongPressTimer,
        downloadSplitButtonProps: (() => {
          const props = buildSavedLibraryDownloadSplitButtonProps(font, sessionFont);
          if (!props) return null;
          return { ...props, hidePrimaryLabel: savedLibraryHideDownloadLabel };
        })(),
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
            key: 'move',
            label: 'Переместить',
            icon: (
              <img
                src={moveAndSwapIconUrl}
                alt=""
                aria-hidden
                className="h-4 w-4 object-contain transition-[filter] duration-150 group-hover/item:invert"
              />
            ),
            submenuItems: (() => {
              const targets = Array.isArray(fontLibraries)
                ? fontLibraries.filter((library) => library.id !== activeSavedLibrary.id)
                : [];
              if (targets.length === 0) {
                return [{ key: 'move-empty', label: 'Переносить пока некуда', disabled: true }];
              }
              return targets.map((library) => ({
                key: `move-${library.id}`,
                label: library.name,
                onSelect: () => {
                  void moveSingleSavedLibraryFont(font, library.id);
                },
              }));
            })(),
          },
          {
            key: 'share',
            label: 'Поделиться',
            icon: <ShareIcon />,
            onSelect: () => {
              openLibraryShareDialog(activeSavedLibrary.id, { onlyFontIds: [font.id] });
            },
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
    onSavedLibrarySelectionCardClick,
    resolveSessionFontForLibraryEntry,
    fontLibraries,
    buildSavedLibraryCardMetaParts,
    savedLibraryCardMetaClassName,
    moveSingleSavedLibraryFont,
    selectedSavedLibraryFontIds,
    openLibraryShareDialog,
    sessionCardPreviewStyleFor,
    startSavedLibraryCardLongPress,
    clearSavedLibraryLongPressTimer,
  ]);

  const activeSavedLibraryCatalogItems = useMemo(() => {
    if (!activeSavedLibrary) return [];
    if (!savedLibrarySearchQueryTrimmed) return [];

    return catalogSearchResults.map((row) => {
      if (row.source === 'google') {
        const family = row.family;
        const entry = row.entry;
        const libraryEntry = { id: `google:${family}`, label: family, source: 'google' };
        const downloadSplitButtonProps = {
          tone: 'light',
          layout: 'comfortable',
          className: '!w-auto max-w-[min(100%,12rem)]',
        hidePrimaryLabel: savedLibraryHideDownloadLabel,
          ...buildCatalogDownloadButtonProps({
          family,
          item: entry,
          onDownloadZip: downloadGooglePackageZip,
          onDownloadAsFormat: (it, format) => downloadGoogleAsFormat(it, format),
          onDownloadVariableVariant: downloadGoogleVariableVariant,
          showVariable: entry?.isVariable === true,
          }),
        };
        const cornerBusy = savedLibraryCatalogAddBusyId === row.id;
        const cornerDone =
          row.alreadyInLibrary || savedLibraryCatalogRecentlyAddedSet.has(row.id);
        return {
          id: row.id,
          selected: false,
          title: family,
          subtitleParts: buildSavedLibraryCardMetaParts({
            id: `google:${family}`,
            label: family,
            source: 'google',
          }),
          subtitleClassName: savedLibraryCardMetaClassName,
          previewStyle: { fontFamily: `'${family}', sans-serif` },
          onCardClick: () => openGoogleCatalogEntryInEditorTab(entry),
          downloadSplitButtonProps,
          cornerAction: (
            <IconCircleButton
              variant="gray100Menu"
              size="sm"
              pressed={cornerBusy || cornerDone}
              className={cornerDone ? '!bg-accent !text-white [&_svg]:!text-white' : ''}
              disabled={row.alreadyInLibrary || cornerBusy}
              aria-label={row.alreadyInLibrary ? 'Уже в библиотеке' : 'Добавить в библиотеку'}
              onClick={(event) => {
                event.stopPropagation();
                if (row.alreadyInLibrary) return;
                if (!activeSavedLibrary?.id) return;
                if (cornerBusy) return;
                setSavedLibraryCatalogAddBusyId(row.id);
                const ok = addFontEntryToLibrary(activeSavedLibrary.id, libraryEntry);
                if (ok) {
                  markSavedLibraryCatalogRecentlyAdded(row.id, 900);
                }
                setSavedLibraryCatalogAddBusyId(null);
              }}
            >
              {cornerBusy ? (
                <CatalogSessionAddSpinner className="text-accent" />
              ) : cornerDone ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-white" aria-hidden>
                  <path
                    d="M4.5 10.5L8.25 14.25L15.5 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
            </IconCircleButton>
          ),
        };
      }

      const family = row.family;
      const slug = row.slug;
      const item = row.item;
      const libraryEntry = {
        id: `fontsource:${slug}`,
        label: family,
        source: 'fontsource',
        isVariable: Boolean(item?.isVariable),
      };
      const downloadSplitButtonProps = {
        tone: 'light',
        layout: 'comfortable',
        className: '!w-auto max-w-[min(100%,12rem)]',
        hidePrimaryLabel: savedLibraryHideDownloadLabel,
        ...buildCatalogDownloadButtonProps({
        family,
        item,
        onDownloadZip: downloadFontsourcePackageZip,
        onDownloadAsFormat: (it, format) => downloadFontsourceAsFormat(it, format),
        onDownloadVariableVariant: downloadFontsourceVariableVariant,
        showVariable: Boolean(item?.isVariable),
        }),
      };
      const cornerBusy = savedLibraryCatalogAddBusyId === row.id;
      const cornerDone =
        row.alreadyInLibrary || savedLibraryCatalogRecentlyAddedSet.has(row.id);
      return {
        id: row.id,
        selected: false,
        title: family,
        subtitleParts: buildSavedLibraryCardMetaParts({
          id: `fontsource:${slug}`,
          label: family,
          source: 'fontsource',
          isVariable: Boolean(item?.isVariable),
        }),
        subtitleClassName: savedLibraryCardMetaClassName,
        previewStyle: { fontFamily: `'${family}', sans-serif` },
        onCardClick: () => openFontsourceSlugInEditorTab(slug, Boolean(item?.isVariable)),
        downloadSplitButtonProps,
        cornerAction: (
          <IconCircleButton
            variant="gray100Menu"
            size="sm"
            pressed={cornerBusy || cornerDone}
            className={cornerDone ? '!bg-red-600 !text-white hover:!bg-red-600 [&_svg]:!text-white' : ''}
            disabled={row.alreadyInLibrary || cornerBusy}
            aria-label={row.alreadyInLibrary ? 'Уже в библиотеке' : 'Добавить в библиотеку'}
            onClick={(event) => {
              event.stopPropagation();
              if (row.alreadyInLibrary) return;
              if (!activeSavedLibrary?.id) return;
              if (cornerBusy) return;
              setSavedLibraryCatalogAddBusyId(row.id);
              const ok = addFontEntryToLibrary(activeSavedLibrary.id, libraryEntry);
              if (ok) {
                markSavedLibraryCatalogRecentlyAdded(row.id, 900);
              }
              setSavedLibraryCatalogAddBusyId(null);
            }}
          >
            {cornerBusy ? (
              <CatalogSessionAddSpinner className="text-accent" />
            ) : cornerDone ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-white" aria-hidden>
                <path
                  d="M4.5 10.5L8.25 14.25L15.5 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <PlusIcon className="h-4 w-4" />
            )}
          </IconCircleButton>
        ),
      };
    });
  }, [
    activeSavedLibrary,
    addFontEntryToLibrary,
    catalogSearchResults,
    markSavedLibraryCatalogRecentlyAdded,
    openFontsourceSlugInEditorTab,
    openGoogleCatalogEntryInEditorTab,
    buildSavedLibraryCardMetaParts,
    savedLibraryCardMetaClassName,
    savedLibrarySearchQueryTrimmed,
    savedLibraryCatalogAddBusyId,
    savedLibraryCatalogRecentlyAddedSet,
    savedLibraryHideDownloadLabel,
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
        moveSelected: null,
        createLibraryFromSelection: null,
    });
  }, [mainTab, fontsLibraryTab]);
  useEffect(() => {
    if (mainTab.startsWith(EMPTY_PREFIX)) return;
    setEmptyTabSelectionActions({
      selectedCount: 0,
      downloadSelected: null,
      downloadSelectedAsFormat: null,
      moveSelected: null,
      createLibraryFromSelection: null,
    });
  }, [mainTab]);


  const tabBarEndActions = useMemo(() => {
    const showCatalogToolbar = mainTab === 'library' && fontsLibraryTab === 'catalog';
    const showSavedLibraryToolbar = mainTab === 'library' && Boolean(activeSavedLibrary);
    const showEmptyTabToolbar = mainTab.startsWith(EMPTY_PREFIX);
    const showFontToolbar =
      mainTab !== EDITOR_MAIN_TAB_PENDING &&
      mainTab !== 'library' &&
      !showEmptyTabToolbar &&
      selectedFont;
    if (showCatalogToolbar) {
      return (
        <SelectionToolbarActions
          selectedCount={catalogSelectionActions.selectedCount || 0}
          moveControl={
            <LibraryMoveMenu
              hasSelection={(catalogSelectionActions.selectedCount || 0) > 0}
              libraries={fontLibraries}
              currentLibraryId={null}
              onMoveToLibrary={catalogSelectionActions.moveSelected}
              onCreateLibrary={catalogSelectionActions.createLibraryFromSelection}
            />
          }
          downloadSelected={catalogSelectionActions.downloadSelected}
          downloadSelectedAsFormat={catalogSelectionActions.downloadSelectedAsFormat}
          emptyTooltip="Выделите карточки в каталоге (долгий зажим), чтобы скачать несколько шрифтов"
        />
      );
    }
    if (showSavedLibraryToolbar) {
      return (
        <SelectionToolbarActions
          selectedCount={selectedSavedLibraryFontIds.size}
          moveControl={
            <LibraryMoveMenu
              hasSelection={selectedSavedLibraryFontIds.size > 0}
              busy={isSavedLibraryMoveBusy}
              libraries={fontLibraries}
              currentLibraryId={activeSavedLibrary?.id || null}
              onMoveToLibrary={moveSelectedSavedLibraryFonts}
              onCreateLibrary={() => requestCreateLibraryWithFonts(selectedSavedLibraryFonts)}
            />
          }
          downloadSelected={selectedSavedLibraryDownloadableCount > 0 ? downloadSelectedSavedLibrary : null}
          downloadSelectedAsFormat={
            selectedSavedLibraryDownloadableCount > 0 ? downloadSelectedSavedLibraryAsFormat : null
          }
          emptyTooltip="Выделите карточки в библиотеке (долгий зажим), чтобы скачать несколько шрифтов"
        />
      );
    }
    if (showEmptyTabToolbar) {
      return (
        <SelectionToolbarActions
          selectedCount={emptyTabSelectionActions.selectedCount || 0}
          moveControl={
            <LibraryMoveMenu
              hasSelection={(emptyTabSelectionActions.selectedCount || 0) > 0}
              libraries={fontLibraries}
              currentLibraryId={null}
              onMoveToLibrary={emptyTabSelectionActions.moveSelected}
              onCreateLibrary={emptyTabSelectionActions.createLibraryFromSelection}
            />
          }
          downloadSelected={emptyTabSelectionActions.downloadSelected}
          downloadSelectedAsFormat={emptyTabSelectionActions.downloadSelectedAsFormat}
          emptyTooltip="Выделите карточки в быстром поиске (долгий зажим), чтобы скачать несколько шрифтов"
        />
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
    activeSavedLibrary,
    fontLibraries,
    downloadSelectedSavedLibrary,
    downloadSelectedSavedLibraryAsFormat,
    mainTab,
    fontsLibraryTab,
    selectedFont,
    handleExportClick,
    handleGenerateClick,
    catalogSelectionActions,
    emptyTabSelectionActions,
    isSavedLibraryMoveBusy,
    moveSelectedSavedLibraryFonts,
    requestCreateLibraryWithFonts,
    selectedSavedLibraryFonts,
    selectedSavedLibraryDownloadableCount,
    selectedSavedLibraryFontIds.size,
  ]);

  const libraryStatusBar = useMemo(() => {
    if (fontsLibraryTab === 'catalog') {
      const cacheStats = getCatalogUnionStats(readGoogleFontCatalogCache(), readFontsourceCatalogCache());
      /** Панели шлют фактический размер после fetch; кэш sessionStorage может быть пустым (квота, старый формат). */
      const stats = {
        ...cacheStats,
        googleTotal: Math.max(cacheStats.googleTotal, googleCatalogTotalItems),
        fontsourceTotal: Math.max(cacheStats.fontsourceTotal, fontsourceCatalogTotalItems),
        googleUniqueFamilies: Math.max(
          cacheStats.googleUniqueFamilies,
          cacheStats.googleTotal === 0 && googleCatalogTotalItems > 0 ? googleCatalogTotalItems : 0,
        ),
        fontsourceUniqueFamilies: Math.max(
          cacheStats.fontsourceUniqueFamilies,
          cacheStats.fontsourceTotal === 0 && fontsourceCatalogTotalItems > 0
            ? fontsourceCatalogTotalItems
            : 0,
        ),
      };
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
    const planBadgeShort = libraryAuthValue.isPro ? 'Pro' : libraryAuthValue.planName || 'Free';
    return {
      leading: '',
      center: (
        <span className="flex min-w-0 max-w-full items-center justify-center gap-2">
          <span className="truncate uppercase">Библиотеки</span>
          <span
            className="shrink-0 rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600"
            title="Тариф"
          >
            {planBadgeShort}
          </span>
        </span>
      ),
    };
  }, [
    fontsLibraryTab,
    catalogSource,
    googleCatalogTotalItems,
    fontsourceCatalogTotalItems,
    activeSavedLibrary,
    libraryAuthValue.isPro,
    libraryAuthValue.planName,
  ]);

  return (
    <LibraryAuthProvider value={libraryAuthValue}>
    <PlansDialog
      open={isPlansOpen}
      onClose={() => setIsPlansOpen(false)}
      currentPlan={libraryAuthValue.isPro ? 'Pro' : 'Free'}
    />
    <div className="flex h-screen min-h-0 flex-row overflow-hidden bg-gray-50">
      <Head>
        <title>DINAMIC FONT — тестирование и сравнение шрифтов</title>
        <meta name="description" content="DINAMIC FONT — тестирование, сравнение и работа со шрифтами" />
        {cssString && <style>{cssString}</style>}
      </Head>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        cssCode={cssString}
        fontName={selectedFont?.name}
        selectedFont={selectedFont}
        variableSettings={variableSettings}
        generateStaticFontFile={generateStaticFontFile}
        downloadFile={downloadFile}
        editorViewMode={viewMode}
        previewText={text}
        fontFamily={exportModalFontFamily}
        fontSize={fontSize}
        lineHeight={lineHeight}
        letterSpacing={letterSpacing}
        textColor={textColor}
        backgroundColor={backgroundColor}
        waterfallExportMeta={waterfallExportMeta}
      />
      <GenerateFontModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedFont={selectedFont}
        variableSettings={variableSettings}
        generateStaticFontFile={generateStaticFontFile}
        downloadFile={downloadFile}
      />
      <LibraryShareDialog
        open={libraryShareDialogOpen}
        onClose={closeLibraryShareDialog}
        library={libraryShareSnapshot}
        initialSelectedFontIds={libraryShareSeedIds}
        resolveSessionFont={resolveSessionFontForLibraryEntry}
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
          onShareLibrary={openLibraryShareDialog}
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
          currentWaterfallBaseSize={liveWaterfallBaseSize}
          onWaterfallBaseSizeLiveChange={handleWaterfallBaseSizeLiveChange}
          onWaterfallBaseSizeCommit={handleWaterfallBaseSizeCommit}
        />
      </div>

      {/* Основная область просмотра с вкладками */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Панель вкладок — flex-шапка, всегда у верхнего края колонки */}
        <div className="editor-tabbar-container z-20 flex min-h-12 w-full shrink-0 items-stretch overflow-visible bg-white">
          {mainTab === EDITOR_MAIN_TAB_PENDING ? (
            <div className="flex w-full items-center gap-2 px-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <div className="h-8 w-28 rounded-md bg-gray-100 animate-pulse" />
                <div className="h-8 w-44 rounded-md bg-gray-100 animate-pulse" />
                <div className="h-8 w-24 rounded-md bg-gray-100 animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-20 rounded-md bg-gray-100 animate-pulse" />
                <div className="h-8 w-10 rounded-md bg-gray-100 animate-pulse" />
              </div>
            </div>
          ) : (
            <EditorTabBar
              mainTab={mainTab}
              emptySlotIds={emptySlotIds}
              emptySlotLabelsById={emptySlotLabelsById}
              fonts={fontsVisibleInTabBar}
              fontTabPlaceholders={fontTabPlaceholders}
              showNewTabSsrFallback={false}
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
          )}
        </div>

        {/* Контент вкладок: «Все шрифты» — внутренний скролл у каталога, не вся страница */}
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden">
          {(() => {
            const isPendingTab = mainTab === EDITOR_MAIN_TAB_PENDING;
            const isLibraryTab = mainTab === 'library';
            const isEmptyTab = mainTab.startsWith(EMPTY_PREFIX);
            const isFontTab = !isPendingTab && !isLibraryTab && !isEmptyTab;
            const fontIsReady = Boolean(sidebarSelectedFont && sidebarSelectedFont.id === mainTab);

            if (isFontTab && !fontIsReady) {
              // Важно: не показываем empty-state (загрузчик/«перетащите шрифт»),
              // если вкладка — шрифт, но сам шрифт ещё не восстановился из IndexedDB.
              return (
                <div className="min-h-0 flex-1 bg-gray-50" aria-hidden>
                  <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-3 px-6 py-6">
                    <div className="h-10 w-72 rounded-md bg-gray-100 animate-pulse" />
                    <div className="h-72 w-full rounded-xl bg-gray-100 animate-pulse" />
                    <div className="h-10 w-60 rounded-md bg-gray-100 animate-pulse" />
                    <div className="h-28 w-full rounded-xl bg-gray-100 animate-pulse" />
                  </div>
                </div>
              );
            }

            if (isPendingTab || isLibraryTab) return null;
            if (!(isEmptyTab || fontIsReady)) return null;

            return (
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
              onSelectionActionsChange={handleEmptyTabSelectionActionsChange}
              selectionActionsActive={isEmptyTab}
              currentWaterfallBaseSize={liveWaterfallBaseSize}
            />
            );
          })()}

          {mainTab === EDITOR_MAIN_TAB_PENDING && (
            <div className="min-h-0 flex-1 bg-gray-50" aria-hidden>
              <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-3 px-6 py-6">
                <div className="h-10 w-56 rounded-md bg-gray-100 animate-pulse" />
                <div className="h-64 w-full rounded-xl bg-gray-100 animate-pulse" />
                <div className="h-10 w-72 rounded-md bg-gray-100 animate-pulse" />
                <div className="h-24 w-full rounded-xl bg-gray-100 animate-pulse" />
              </div>
            </div>
          )}

          {mainTab === 'library' && (
            <FontsLibraryHomeScreen
              libraryTabs={libraryTabs}
              fontsLibraryTab={fontsLibraryTab}
              setFontsLibraryTab={setFontsLibraryTab}
              handleLibraryTabDragOver={handleLibraryTabDragOver}
              handleLibraryTabDrop={handleLibraryTabDrop}
              libraryDropTargetTabId={libraryDropTargetTabId}
              setLibraryDropTargetTabId={setLibraryDropTargetTabId}
              catalogSource={catalogSource}
              setCatalogSource={setCatalogSource}
              catalogSourceToggleClassName={catalogSourceToggleClassName}
              fonts={fonts}
              fontLibraries={fontLibraries}
              addFontEntryToLibrary={addFontEntryToLibrary}
              requestCreateLibraryWithFonts={requestCreateLibraryWithFonts}
              openGoogleCatalogEntryInEditorTab={openGoogleCatalogEntryInEditorTab}
              openFontsourceSlugInEditorTab={openFontsourceSlugInEditorTab}
              handleCatalogSelectionActionsChange={handleCatalogSelectionActionsChange}
              setGoogleCatalogTotalItems={setGoogleCatalogTotalItems}
              setFontsourceCatalogTotalItems={setFontsourceCatalogTotalItems}
              activeSavedLibrary={activeSavedLibrary}
              savedLibraryToolbarIsWideRow={savedLibraryToolbarIsWideRow}
              savedLibrarySearchWrapRef={savedLibrarySearchWrapRef}
              savedLibraryFontsScope={savedLibraryFontsScope}
              setSavedLibraryFontsScope={setSavedLibraryFontsScope}
              activeSavedLibraryScopeOptions={activeSavedLibraryScopeOptions}
              savedLibrarySearchActive={savedLibrarySearchActive}
              savedLibrarySearchOverlayEnabled={savedLibrarySearchOverlayEnabled}
              savedLibraryCatalogSearchSource={savedLibraryCatalogSearchSource}
              setSavedLibraryCatalogSearchSource={setSavedLibraryCatalogSearchSource}
              savedLibrarySourceButtonBaseClass={savedLibrarySourceButtonBaseClass}
              savedLibrarySearchInputRef={savedLibrarySearchInputRef}
              savedLibrarySearchQuery={savedLibrarySearchQuery}
              setSavedLibrarySearchQuery={setSavedLibrarySearchQuery}
              setIsSavedLibrarySearchExpanded={setIsSavedLibrarySearchExpanded}
              handleSavedLibrarySearchBlur={handleSavedLibrarySearchBlur}
              savedLibrarySearchQueryTrimmed={savedLibrarySearchQueryTrimmed}
              clearSavedLibrarySearchTextOnly={clearSavedLibrarySearchTextOnly}
              clearSavedLibrarySearch={clearSavedLibrarySearch}
              savedLibraryShareButton={savedLibraryShareButton}
              savedLibrarySearchDesktopControls={savedLibrarySearchDesktopControls}
              savedLibraryFilterVariable={savedLibraryFilterVariable}
              setSavedLibraryFilterVariable={setSavedLibraryFilterVariable}
              savedLibraryVariableOptions={savedLibraryVariableOptions}
              savedLibraryFilterSubsets={savedLibraryFilterSubsets}
              setSavedLibraryFilterSubsets={setSavedLibraryFilterSubsets}
              savedLibrarySubsetOptions={savedLibrarySubsetOptions}
              savedLibraryFilterItalic={savedLibraryFilterItalic}
              setSavedLibraryFilterItalic={setSavedLibraryFilterItalic}
              savedLibraryToolbarViewportW={savedLibraryToolbarViewportW}
              savedLibraryToolbarIsTightResetGap={savedLibraryToolbarIsTightResetGap}
              resetSavedLibraryFilters={resetSavedLibraryFilters}
              savedLibraryHasAdvancedFilters={savedLibraryHasAdvancedFilters}
              savedLibraryResetLabel={savedLibraryResetLabel}
              renderSavedLibrarySearchToggleButton={renderSavedLibrarySearchToggleButton}
              openSavedLibrarySearch={openSavedLibrarySearch}
              activeSavedLibraryScopeCounts={activeSavedLibraryScopeCounts}
              savedLibraryToolbarIs4Col={savedLibraryToolbarIs4Col}
              savedLibraryToolbarIs2Col={savedLibraryToolbarIs2Col}
              savedLibraryToolbarIs5Col={savedLibraryToolbarIs5Col}
              savedLibrarySearchInlineButton={savedLibrarySearchInlineButton}
              savedLibrarySearchMobileExpandedControls={savedLibrarySearchMobileExpandedControls}
              activeSavedLibraryItems={activeSavedLibraryItems}
              activeSavedLibraryCatalogItems={activeSavedLibraryCatalogItems}
              filteredActiveSavedLibraryFonts={filteredActiveSavedLibraryFonts}
              selectedSavedLibraryFontIds={selectedSavedLibraryFontIds}
              handleMoveLibraryFont={handleMoveLibraryFont}
              setFileUploadTarget={setFileUploadTarget}
              fileInputRef={fileInputRef}
              libraryStatusBar={libraryStatusBar}
            />
          )}
        </div>
      </div>
    </div>
    </LibraryAuthProvider>
  );
} 
