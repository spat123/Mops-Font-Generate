import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { NextRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useFontContext } from '../contexts/FontContext';
import { useSettings } from '../contexts/SettingsContext';
import { useFontLibraries } from './useFontLibraries';
import { useEditorFontTabActions } from './useEditorFontTabActions';
import { useLibraryAuth } from './useLibraryAuth';
import { useSavedLibrarySearchQuery } from './useSavedLibrarySearchQuery';
import { useSavedLibrarySearchControls } from './useSavedLibrarySearchControls';
import { useEditorCatalogDeepLink } from './useEditorCatalogDeepLink';
import { useEditorExportActions } from './useEditorExportActions';
import { useEditorTabBarModel } from './useEditorTabBarModel';
import { useEmptyPreviewSlots } from './useEmptyPreviewSlots';
import { useShareRouteRedirect } from './useShareRouteRedirect';
import { useEditorPreviewOrchestrator } from './useEditorPreviewOrchestrator';
import { useEditorShellEffects } from './useEditorShellEffects';
import { useEditorFileUpload } from './useEditorFileUpload';
import { useEditorWaterfallLiveSize } from './useEditorWaterfallLiveSize';
import { useSavedLibraryFilters } from './useSavedLibraryFilters';
import { useLibraryStatusBar } from './useLibraryStatusBar';
import { useSavedLibraryActions } from './useSavedLibraryActions';
import { useSavedLibraryDerivedState } from './useSavedLibraryDerivedState';
import { useCatalogCachesWarmup } from './useCatalogCachesWarmup';
import {
  libraryNeedsFontfabricTrialCatalog,
  libraryNeedsFontshareCatalog,
  libraryNeedsFontsourceCatalog,
  libraryNeedsGoogleCatalog,
} from '../utils/ensureCatalogCachesLoaded';
import { useSavedLibraryToolbarLayout } from './useSavedLibraryToolbarLayout';
import { useCatalogOpenInEditor } from './useCatalogOpenInEditor';
import { useOpenLibraryFontEntry } from './useOpenLibraryFontEntry';
import { useSavedLibraryCardItems } from './useSavedLibraryCardItems';
import {
  EMPTY_SELECTION_TOOLBAR_ACTIONS,
  normalizeSelectionToolbarActions,
} from '../utils/selectionToolbarActionsState';
import { isInteractiveTarget } from '../utils/dom/isInteractiveTarget';
import { useStickyTimedSet } from '../components/ui/useStickyTimedSet';
import { useSavedLibrarySelection } from './useSavedLibrarySelection';
import { useLibraryFontSessionLookup } from './useLibraryFontSessionLookup';
import { EDITOR_MAIN_TAB_PENDING, isFontTabId } from '../utils/editorShellStorage';
import { useEditorShellPersistence } from './useEditorShellPersistence';
import { useSessionFontTabsPreviewCache } from './useSessionFontTabsPreviewCache';
import { buildEditorHomeLayoutProps } from './buildEditorHomeLayoutProps';
import type { EditorHomeLayoutProps } from '../types/editorHome';

export function useEditorHomePage(router: NextRouter) {
  useShareRouteRedirect(router);

    // Получаем настройки из контекста
    const { 
      text, setText, 
      fontSize, setFontSize, 
      glyphsFontSize, setGlyphsFontSize,
      stylesFontSize, setStylesFontSize,
      lineHeight, setLineHeight, 
      letterSpacing, setLetterSpacing, 
      stylesLetterSpacing, setStylesLetterSpacing,
      openTypeFeatureOverrides,
      setOpenTypeFeatureOverrides,
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
      previewBackgroundImage,
      setPreviewBackgroundImage,
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
    /** Подписи вкладок из прошлого визита — показываем до прихода fonts из IndexedDB (без «мигания»). */
    const [tabStripPreviewFromCache, setTabStripPreviewFromCache] = useState([]);
    const [closedLibraryFontIds, setClosedLibraryFontIds] = useState([]);
    const [savedLibraryCatalogAddBusyId, setSavedLibraryCatalogAddBusyId] = useState(null);
    const { set: savedLibraryCatalogRecentlyAddedSet, mark: markSavedLibraryCatalogRecentlyAdded } =
      useStickyTimedSet(900);
    const [fileUploadTarget, setFileUploadTarget] = useState('editor');
    const [libraryCreateDialogRequest, setLibraryCreateDialogRequest] = useState(null);
    const [openCreateLibrarySignal, setOpenCreateLibrarySignal] = useState(0);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [plainPreviewOpen, setPlainPreviewOpen] = useState(false);
    const [catalogSelectionActions, setCatalogSelectionActions] = useState(
      EMPTY_SELECTION_TOOLBAR_ACTIONS,
    );
    const [emptyTabSelectionActions, setEmptyTabSelectionActions] = useState(
      EMPTY_SELECTION_TOOLBAR_ACTIONS,
    );
    const [catalogPreviewSlotsById, setCatalogPreviewSlotsById] = useState({});
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

    const { libraryAuthValue, isPlansOpen, setIsPlansOpen, assertCanCreateNewLibrary } = useLibraryAuth({
      authStatus,
      session,
      needsLink,
      fontLibraries,
    });

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
      applyCatalogSubset,
      catalogSubsetOptions,
      activeCatalogSubset,
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

    const {
      libraryDropTargetTabId,
      setLibraryDropTargetTabId,
      handleCreateSavedLibrary,
      handleUpdateSavedLibrary,
      handleDeleteSavedLibrary,
      handleMoveLibraryFont,
      addFontEntryToLibrary,
      duplicateLibraryFontEntryInLibrary,
      handleLibraryTabDragOver,
      handleLibraryTabDrop,
      moveFontEntryToLibrary,
      requestCreateLibraryWithFonts,
      openSavedLibrary,
    } = useSavedLibraryActions({
      fontLibraries,
      createFontLibrary,
      updateFontLibrary,
      deleteFontLibrary,
      reorderLibraryFonts,
      fonts,
      mainTab,
      emptySlotIds,
      closedLibraryFontIds,
      selectedFont,
      setFontsLibraryTab,
      setMainTab,
      setSelectedFont,
      setClosedLibraryFontIds,
      removeFontsByIds,
      safeSelectFont,
      assertCanCreateNewLibrary,
      setLibraryCreateDialogRequest,
    });

    const handleLibraryCreateDialogHandled = useCallback((requestId: string) => {
      setLibraryCreateDialogRequest((prev) =>
        prev?.requestId === requestId ? null : prev,
      );
    }, []);

    const requestOpenCreateLibrary = useCallback(() => {
      if (!assertCanCreateNewLibrary()) return;
      setLibraryCreateDialogRequest({
        requestId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `library-dialog:${Date.now()}`,
        mode: 'create',
        selectedFonts: [],
      });
    }, [assertCanCreateNewLibrary, setLibraryCreateDialogRequest]);

    const requestOpenEditLibrary = useCallback((library) => {
      setLibraryCreateDialogRequest({
        requestId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `library-dialog:${Date.now()}`,
        mode: 'edit',
        library,
      });
    }, []);

    // Добавляем ref для input загрузки файлов
    const fileInputRef = useRef(null);

    const {
      handleFontsUploadedWithNav,
      selectOrAddFontsourceFontWithNav,
      openGoogleCatalogEntryInEditorTab,
      openFontsourceSlugInEditorTab,
      openFontshareSlugInEditorTab,
      openFontfabricTrialPage,
      uploadFontfabricTrialRef,
      onUploadFontfabricTrial,
    } = useCatalogOpenInEditor({
      fonts,
      handleFontsUploaded,
      selectOrAddFontsourceFont,
      safeSelectFont,
      setClosedLibraryFontIds,
      mainTab,
      setMainTab,
      setEmptySlotIds,
      setFontsLibraryTab,
      fileInputRef,
      setFileUploadTarget,
    });

    const { resolveSessionFontForLibraryEntry, isFontStoredInAnyLibrary } = useLibraryFontSessionLookup({
      fonts,
      fontLibraries,
    });

    const initialSessionFontOrderIdsRef = useRef([]);

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

    useEditorPreviewOrchestrator({
      getPreviewSettingsValues: () => ({
        text,
        fontSize,
        glyphsFontSize,
        stylesFontSize,
        lineHeight,
        letterSpacing,
        stylesLetterSpacing,
        openTypeFeatureOverrides,
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
        previewBackgroundImage,
      }),
      getPreviewSettingsSetters: () => ({
        setText,
        setFontSize,
        setGlyphsFontSize,
        setStylesFontSize,
        setLineHeight,
        setLetterSpacing,
        setStylesLetterSpacing,
        setOpenTypeFeatureOverrides,
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
        setPreviewBackgroundImage,
      }),
      previewSettingsDeps: [
        text,
        fontSize,
        glyphsFontSize,
        stylesFontSize,
        lineHeight,
        letterSpacing,
        stylesLetterSpacing,
        openTypeFeatureOverrides,
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
        previewBackgroundImage,
      ],
      hasRestoredEditorMainTab,
      isInitialLoadComplete,
      mainTab,
      fonts,
      setFonts,
      initialSessionFontOrderIdsRef,
    });

    const { sidebarSelectedFont, fontTabPlaceholders, emptySlotLabelsById, fontsVisibleInTabBar } =
      useEditorTabBarModel({
        mainTab,
        selectedFont,
        catalogPreviewSlotsById,
        fonts,
        closedLibraryFontIds,
        isInitialLoadComplete,
        tabStripPreviewFromCache,
      });

    const { addEmptyPreviewSlot, handleRemoveEmptySlot } = useEmptyPreviewSlots({
      emptySlotIds,
      setEmptySlotIds,
      catalogPreviewSlotsById,
      setCatalogPreviewSlotsById,
      mainTab,
      setMainTab,
      setSelectedFont,
    });

    /** После merge previewSettings в массиве fonts — обновить ссылку selectedFont */
    useEffect(() => {
      if (!selectedFont?.id) return;
      const fresh = fonts.find((f) => f.id === selectedFont.id);
      if (fresh && fresh !== selectedFont) {
        setSelectedFont(fresh);
      }
    }, [fonts, selectedFont, setSelectedFont]);

    /** При клике по вкладке шрифта — восстановить selectedFont и настройки превью. */
    useEffect(() => {
      if (!isInitialLoadComplete) return;
      if (!isFontTabId(mainTab)) return;
      const tabFont = fonts.find((font) => font.id === mainTab);
      if (!tabFont) return;
      if (selectedFont?.id !== mainTab) {
        safeSelectFont(tabFont);
      }
    }, [fonts, isInitialLoadComplete, mainTab, safeSelectFont, selectedFont?.id]);

    const savedLibrarySearchQueryState = useSavedLibrarySearchQuery();
    const { resetSavedLibrarySearch } = savedLibrarySearchQueryState;

    const {
      savedLibraryFontsScope,
      setSavedLibraryFontsScope,
      savedLibraryFilterSubsets,
      setSavedLibraryFilterSubsets,
      savedLibraryFilterVariable,
      setSavedLibraryFilterVariable,
      savedLibraryFilterItalic,
      setSavedLibraryFilterItalic,
      savedLibraryVariableOptions,
      savedLibraryHasAdvancedFilters,
      resetSavedLibraryFilters,
      savedLibraryCardMetaClassName,
      libraryTabs,
      activeSavedLibrary,
      activeSavedLibraryScopeCounts,
      activeSavedLibraryScopeOptions,
    } = useSavedLibraryFilters({
      fontLibraries,
      fontsLibraryTab,
      resetSavedLibrarySearch,
    });

    const {
      viewportW: savedLibraryToolbarViewportW,
      is2Col: savedLibraryToolbarIs2Col,
      is4Col: savedLibraryToolbarIs4Col,
      is5Col: savedLibraryToolbarIs5Col,
      isWideRow: savedLibraryToolbarIsWideRow,
      isTightResetGap: savedLibraryToolbarIsTightResetGap,
      hideDownloadLabel: savedLibraryHideDownloadLabel,
      searchOverlayEnabled: savedLibrarySearchOverlayEnabled,
      resetLabel: savedLibraryResetLabel,
    } = useSavedLibraryToolbarLayout();

    const activeLibraryFonts = useMemo(
      () => (Array.isArray(activeSavedLibrary?.fonts) ? activeSavedLibrary.fonts : []),
      [activeSavedLibrary],
    );
    const savedLibraryNeedsGoogleCatalog = useMemo(
      () => libraryNeedsGoogleCatalog(activeLibraryFonts),
      [activeLibraryFonts],
    );
    const savedLibraryNeedsFontsourceCatalog = useMemo(
      () => libraryNeedsFontsourceCatalog(activeLibraryFonts),
      [activeLibraryFonts],
    );
    const savedLibraryNeedsFontshareCatalog = useMemo(
      () => libraryNeedsFontshareCatalog(activeLibraryFonts),
      [activeLibraryFonts],
    );
    const savedLibraryNeedsFontfabricTrialCatalog = useMemo(
      () => libraryNeedsFontfabricTrialCatalog(activeLibraryFonts),
      [activeLibraryFonts],
    );
    const catalogCacheRevision = useCatalogCachesWarmup(
      mainTab === 'library' &&
        fontsLibraryTab !== 'catalog' &&
        Boolean(activeSavedLibrary) &&
        (savedLibraryNeedsGoogleCatalog ||
          savedLibraryNeedsFontsourceCatalog ||
          savedLibraryNeedsFontshareCatalog ||
          savedLibraryNeedsFontfabricTrialCatalog),
      {
        needsGoogle: savedLibraryNeedsGoogleCatalog,
        needsFontsource: savedLibraryNeedsFontsourceCatalog,
        needsFontshare: savedLibraryNeedsFontshareCatalog,
        needsFontfabricTrial: savedLibraryNeedsFontfabricTrialCatalog,
      },
    );

    const {
      savedLibrarySubsetOptions,
      buildSavedLibraryCardMetaSplit,
      filteredActiveSavedLibraryFonts,
      catalogSearchResults,
    } = useSavedLibraryDerivedState({
      activeSavedLibrary,
      savedLibraryFontsScope,
      savedLibrarySearchQueryTrimmed: savedLibrarySearchQueryState.savedLibrarySearchQueryTrimmed,
      savedLibraryFilterSubsets,
      savedLibraryFilterVariable,
      savedLibraryFilterItalic,
      catalogCacheRevision,
    });

    const {
      libraryShareDialogOpen,
      libraryShareSnapshot,
      libraryShareSeedIds,
      closeLibraryShareDialog,
      openLibraryShareDialog,
      openLibraryShareDialogRef,
      isSavedLibraryMoveBusy,
      selectedSavedLibraryFontIds,
      setSelectedSavedLibraryFontIds,
      startSavedLibraryCardLongPress,
      onSavedLibrarySelectionCardClick,
      clearSavedLibraryLongPressTimer,
      selectedSavedLibraryFonts,
      selectedSavedLibraryDownloadableCount,
      downloadSelectedSavedLibrary,
      downloadSelectedSavedLibraryAsFormat,
      moveSelectedSavedLibraryFonts,
      moveSingleSavedLibraryFont,
    } = useSavedLibrarySelection({
      activeSavedLibrary,
      filteredActiveSavedLibraryFonts,
      fontLibraries,
      handleUpdateSavedLibrary,
      isInteractiveTarget,
    });

    const {
      savedLibraryShareButton,
      renderSavedLibrarySearchToggleButton,
      savedLibrarySearchInlineButton,
      savedLibrarySearchExpandField,
      savedLibrarySearchCol5Trailing,
      savedLibrarySearchDesktopControls,
      savedLibrarySearchMobileExpandedControls,
    } = useSavedLibrarySearchControls({
      ...savedLibrarySearchQueryState,
      selectedSavedLibraryFontIds,
      openLibraryShareDialogRef,
      savedLibraryToolbarIs5Col,
    });

    const {
      savedLibrarySearchQuery,
      setSavedLibrarySearchQuery,
      setIsSavedLibrarySearchExpanded,
      savedLibrarySearchQueryTrimmed,
      savedLibrarySearchActive,
      savedLibrarySearchWrapRef,
      savedLibrarySearchInputRef,
      clearSavedLibrarySearch,
      clearSavedLibrarySearchTextOnly,
      openSavedLibrarySearch,
      handleSavedLibrarySearchBlur,
    } = savedLibrarySearchQueryState;

    useSessionFontTabsPreviewCache({
      isInitialLoadComplete,
      fontsVisibleInTabBar,
      setTabStripPreviewFromCache,
    });

    useEditorShellEffects({
      mainTab,
      fontsLibraryTab,
      fontLibraries,
      setFontsLibraryTab,
      fonts,
      isInitialLoadComplete,
      selectedFont,
      setMainTab,
      setClosedLibraryFontIds,
      isFontStoredInAnyLibrary,
      hasRestoredEditorMainTab,
      emptySlotIds,
      fontsVisibleInTabBar,
      fontTabPlaceholders,
      setPlainPreviewOpen,
      setCatalogSelectionActions,
      setEmptyTabSelectionActions,
    });

    useEditorCatalogDeepLink({
      router,
      isInitialLoadComplete,
      openGoogleCatalogEntryInEditorTab,
      openFontsourceSlugInEditorTab,
      setViewMode,
    });

    const openLibraryFontEntry = useOpenLibraryFontEntry({
      fonts,
      resolveSessionFontForLibraryEntry,
      setClosedLibraryFontIds,
      safeSelectFont,
      setMainTab,
      selectOrAddFontsourceFontWithNav,
      handleFontsUploadedWithNav,
    });

    const { pickFont, closeFontTab } = useEditorFontTabActions({
      fonts,
      mainTab,
      emptySlotIds,
      closedLibraryFontIds,
      selectedFont,
      setClosedLibraryFontIds,
      setMainTab,
      setSelectedFont,
      safeSelectFont,
      removeFont,
      isFontStoredInAnyLibrary,
    });

    const toggleAnimation = () => {
      setIsAnimating(!isAnimating);
    };

    const {
      liveWaterfallBaseSize,
      handleWaterfallBaseSizeLiveChange,
      handleWaterfallBaseSizeCommit,
    } = useEditorWaterfallLiveSize({
      mainTab,
      selectedFont,
      viewMode,
      waterfallBaseSize,
      setWaterfallBaseSize,
    });

    const {
      exportModalFontFamily,
      waterfallExportMeta,
      handleExportClick,
      handleGenerateClick,
    } = useEditorExportActions({
      selectedFont,
      variableSettings,
      fontSize,
      lineHeight,
      letterSpacing,
      textColor,
      textDirection,
      textAlignment,
      textCase,
      getFontFamily,
      waterfallRows,
      liveWaterfallBaseSize,
      waterfallBaseSize,
      waterfallUnit,
      waterfallScaleRatio,
      waterfallEditTarget,
      setCssString,
      setIsExportModalOpen,
      setIsGenerateModalOpen,
    });

    const handleFileUpload = useEditorFileUpload({
      fileUploadTarget,
      setFileUploadTarget,
      activeSavedLibrary,
      handleFontsUploadedWithNav,
      handleUpdateSavedLibrary,
      fileInputRef,
    });

    const closePlainPreview = useCallback(() => setPlainPreviewOpen(false), []);

    const openAllFontsTab = useCallback(() => {
      setMainTab('library');
    }, []);

    const handleCatalogSelectionActionsChange = useCallback((nextActions) => {
      setCatalogSelectionActions(normalizeSelectionToolbarActions(nextActions));
    }, []);
    const handleEmptyTabSelectionActionsChange = useCallback((nextActions) => {
      setEmptyTabSelectionActions(normalizeSelectionToolbarActions(nextActions));
    }, []);

    const { activeSavedLibraryItems, activeSavedLibraryCatalogItems } = useSavedLibraryCardItems({
      activeSavedLibrary,
      filteredActiveSavedLibraryFonts,
      catalogSearchResults,
      savedLibrarySearchQueryTrimmed,
      mainTab,
      fontLibraries,
      selectedSavedLibraryFontIds,
      buildSavedLibraryCardMetaSplit,
      savedLibraryCardMetaClassName,
      savedLibraryHideDownloadLabel,
      resolveSessionFontForLibraryEntry,
      openLibraryFontEntry,
      onSavedLibrarySelectionCardClick,
      startSavedLibraryCardLongPress,
      clearSavedLibraryLongPressTimer,
      openLibraryShareDialog,
      handleUpdateSavedLibrary,
      openGoogleCatalogEntryInEditorTab,
      openFontsourceSlugInEditorTab,
      addFontEntryToLibrary,
      duplicateLibraryFontEntryInLibrary,
      moveSingleSavedLibraryFont,
      savedLibraryCatalogAddBusyId,
      setSavedLibraryCatalogAddBusyId,
      savedLibraryCatalogRecentlyAddedSet,
      markSavedLibraryCatalogRecentlyAdded,
    });

    const libraryStatusBar = useLibraryStatusBar({
      fontsLibraryTab,
      activeSavedLibrary,
      libraryAuthValue,
    });

    // Не memo: openRequest диалога библиотеки и колбэки каталога должны обновляться на каждый рендер.
  const layout: EditorHomeLayoutProps = buildEditorHomeLayoutProps({
        cssString,
        mainTab,
        fontsLibraryTab,
        activeSavedLibrary,
        selectedFont,
        fontLibraries,
        catalogSelectionActions,
        emptyTabSelectionActions,
        selectedSavedLibraryFontIds,
        isSavedLibraryMoveBusy,
        moveSelectedSavedLibraryFonts,
        requestCreateLibraryWithFonts,
        selectedSavedLibraryFonts,
        selectedSavedLibraryDownloadableCount,
        downloadSelectedSavedLibrary,
        downloadSelectedSavedLibraryAsFormat,
        handleGenerateClick,
        handleExportClick,
        onPlainPreviewOpen: () => setPlainPreviewOpen(true),
        isExportModalOpen,
        onCloseExportModal: () => setIsExportModalOpen(false),
        isGenerateModalOpen,
        onCloseGenerateModal: () => setIsGenerateModalOpen(false),
        variableSettings,
        generateStaticFontFile,
        downloadFile,
        viewMode,
        text,
        exportModalFontFamily,
        fontSize,
        lineHeight,
        letterSpacing,
        textColor,
        backgroundColor,
        waterfallExportMeta,
        libraryShareDialogOpen,
        closeLibraryShareDialog,
        libraryShareSnapshot,
        libraryShareSeedIds,
        resolveSessionFontForLibraryEntry,
        fileInputRef,
        handleFileUpload,
        pickFont,
        openSavedLibrary,
        handleCreateSavedLibrary,
        handleUpdateSavedLibrary,
        handleDeleteSavedLibrary,
        reorderFontLibraries,
        addFontEntryToLibrary,
        fonts,
        libraryCreateDialogRequest,
        onLibraryCreateDialogHandled: handleLibraryCreateDialogHandled,
        openCreateLibrarySignal,
        setOpenCreateLibrarySignal,
        requestOpenCreateLibrary,
        requestOpenEditLibrary,
        openLibraryShareDialog,
        handleVariableSettingsChange,
        availableStyles,
        selectedPresetName,
        applyPresetStyle,
        applyCatalogSubset,
        catalogSubsetOptions,
        activeCatalogSubset,
        getVariableAxes,
        resetVariableSettings,
        emptySlotIds,
        emptySlotLabelsById,
        fontsVisibleInTabBar,
        fontTabPlaceholders,
        catalogPreviewSlotsById,
        openAllFontsTab,
        handleRemoveEmptySlot,
        addEmptyPreviewSlot,
        closeFontTab,
        setMainTab,
        setClosedLibraryFontIds,
        safeSelectFont,
        setSelectedFont,
        sidebarSelectedFont,
        plainPreviewOpen,
        closePlainPreview,
        getFontFamily,
        getVariationSettings,
        handleFontsUploadedWithNav,
        selectOrAddFontsourceFontWithNav,
        fontCssProperties,
        moveFontEntryToLibrary,
        handleEmptyTabSelectionActionsChange,
        isAnimating,
        toggleAnimation,
        liveWaterfallBaseSize,
        handleWaterfallBaseSizeLiveChange,
        handleWaterfallBaseSizeCommit,
        libraryTabs,
        setFontsLibraryTab,
        handleLibraryTabDragOver,
        handleLibraryTabDrop,
        libraryDropTargetTabId,
        setLibraryDropTargetTabId,
        openGoogleCatalogEntryInEditorTab,
        openFontsourceSlugInEditorTab,
        openFontshareSlugInEditorTab,
        openFontfabricTrialPage,
        onUploadFontfabricTrial,
        handleCatalogSelectionActionsChange,
        savedLibraryToolbarIsWideRow,
        savedLibrarySearchWrapRef,
        savedLibraryFontsScope,
        setSavedLibraryFontsScope,
        activeSavedLibraryScopeOptions,
        savedLibrarySearchActive,
        savedLibrarySearchOverlayEnabled,
        savedLibrarySearchInputRef,
        savedLibrarySearchQuery,
        setSavedLibrarySearchQuery,
        setIsSavedLibrarySearchExpanded,
        handleSavedLibrarySearchBlur,
        savedLibrarySearchQueryTrimmed,
        clearSavedLibrarySearchTextOnly,
        clearSavedLibrarySearch,
        savedLibraryShareButton,
        savedLibrarySearchExpandField,
        savedLibrarySearchCol5Trailing,
        savedLibrarySearchDesktopControls,
        savedLibraryFilterVariable,
        setSavedLibraryFilterVariable,
        savedLibraryVariableOptions,
        savedLibraryFilterSubsets,
        setSavedLibraryFilterSubsets,
        savedLibrarySubsetOptions,
        savedLibraryFilterItalic,
        setSavedLibraryFilterItalic,
        savedLibraryToolbarViewportW,
        savedLibraryToolbarIsTightResetGap,
        resetSavedLibraryFilters,
        savedLibraryHasAdvancedFilters,
        savedLibraryResetLabel,
        renderSavedLibrarySearchToggleButton,
        openSavedLibrarySearch,
        activeSavedLibraryScopeCounts,
        savedLibraryToolbarIs4Col,
        savedLibraryToolbarIs2Col,
        savedLibraryToolbarIs5Col,
        savedLibrarySearchInlineButton,
        savedLibrarySearchMobileExpandedControls,
        activeSavedLibraryItems,
        activeSavedLibraryCatalogItems,
        filteredActiveSavedLibraryFonts,
        handleMoveLibraryFont,
        setFileUploadTarget,
        libraryStatusBar,
      });

  return {
    libraryAuthValue,
    isPlansOpen,
    setIsPlansOpen,
    layout,
  };
}
