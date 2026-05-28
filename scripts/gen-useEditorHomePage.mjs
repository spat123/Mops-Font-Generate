import fs from 'fs';

const src = fs.readFileSync('pages/index.jsx', 'utf8');
const start = src.indexOf('useShareRouteRedirect(router);');
const end = src.indexOf('const tabBarEndActions =');
const body = src.slice(start, end);

const header = `import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { NextRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { useFontContext } from '../contexts/FontContext';
import { useSettings } from '../contexts/SettingsContext';
import { useFontLibraries } from '../hooks/useFontLibraries';
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
import { EDITOR_MAIN_TAB_PENDING } from '../utils/editorShellStorage';
import { useEditorShellPersistence } from './useEditorShellPersistence';
import { useSessionFontTabsPreviewCache } from './useSessionFontTabsPreviewCache';
import { buildEditorHomeLayoutProps } from './buildEditorHomeLayoutProps';
import type { EditorHomeLayoutProps } from '../types/editorHome';

export function useEditorHomePage(router: NextRouter) {
`;

const footer = `
  const layout: EditorHomeLayoutProps = useMemo(
    () =>
      buildEditorHomeLayoutProps({
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
        createLibrarySeedRequest,
        onCreateLibrarySeedHandled: (requestId: string) =>
          setCreateLibrarySeedRequest((prev) =>
            prev?.requestId === requestId ? null : prev,
          ),
        openLibraryShareDialog,
        handleVariableSettingsChange,
        availableStyles,
        selectedPresetName,
        applyPresetStyle,
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
        fonts,
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
      }),
    [
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
      libraryStatusBar,
      isExportModalOpen,
      isGenerateModalOpen,
      plainPreviewOpen,
      sidebarSelectedFont,
      isAnimating,
      liveWaterfallBaseSize,
      activeSavedLibraryItems,
      activeSavedLibraryCatalogItems,
    ],
  );

  return {
    libraryAuthValue,
    isPlansOpen,
    setIsPlansOpen,
    layout,
  };
}
`;

const indentedBody = body
  .split('\n')
  .map((line) => (line.length ? `  ${line}` : line))
  .join('\n');

fs.writeFileSync('hooks/useEditorHomePage.ts', header + indentedBody + footer);
console.log('hooks/useEditorHomePage.ts written');
