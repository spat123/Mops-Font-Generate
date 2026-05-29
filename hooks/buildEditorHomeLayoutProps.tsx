import React from 'react';
import { EditorTabBarEndActions } from '../components/editor/EditorTabBarEndActions';
import type { EditorHomeLayoutProps } from '../types/editorHome';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';
import type { SavedLibraryFontEntry, SelectionToolbarActions } from '../types/savedLibrary';

/** Собирает пропсы `EditorHomeLayout` из view-model страницы. */
export function buildEditorHomeLayoutProps(vm: Record<string, unknown>): EditorHomeLayoutProps {
  const tabBarEndActions = (
    <EditorTabBarEndActions
      mainTab={vm.mainTab as string}
      fontsLibraryTab={vm.fontsLibraryTab as string}
      activeSavedLibrary={vm.activeSavedLibrary as SavedLibraryRecord | null}
      selectedFont={vm.selectedFont as SessionFontRecord | null}
      fontLibraries={vm.fontLibraries as SavedLibraryRecord[]}
      catalogSelectionActions={vm.catalogSelectionActions as SelectionToolbarActions}
      emptyTabSelectionActions={vm.emptyTabSelectionActions as SelectionToolbarActions}
      selectedSavedLibraryFontIds={vm.selectedSavedLibraryFontIds as Set<string>}
      isSavedLibraryMoveBusy={vm.isSavedLibraryMoveBusy as boolean}
      moveSelectedSavedLibraryFonts={vm.moveSelectedSavedLibraryFonts as () => void}
      requestCreateLibraryWithFonts={vm.requestCreateLibraryWithFonts as (fonts: unknown) => void}
      selectedSavedLibraryFonts={vm.selectedSavedLibraryFonts as SavedLibraryFontEntry[]}
      selectedSavedLibraryDownloadableCount={vm.selectedSavedLibraryDownloadableCount as number}
      downloadSelectedSavedLibrary={vm.downloadSelectedSavedLibrary as (() => void) | null}
      downloadSelectedSavedLibraryAsFormat={
        vm.downloadSelectedSavedLibraryAsFormat as ((format: string) => void) | null
      }
      onGenerateClick={vm.handleGenerateClick as () => void}
      onExportClick={vm.handleExportClick as () => void}
      onPlainPreviewOpen={vm.onPlainPreviewOpen as () => void}
    />
  );

  return {
    cssString: vm.cssString as string,
    modals: {
      export: {
        isOpen: vm.isExportModalOpen,
        onClose: vm.onCloseExportModal,
        cssCode: vm.cssString,
        fontName: (vm.selectedFont as { name?: string } | null)?.name,
        selectedFont: vm.selectedFont,
        variableSettings: vm.variableSettings,
        generateStaticFontFile: vm.generateStaticFontFile,
        downloadFile: vm.downloadFile,
        editorViewMode: vm.viewMode,
        previewText: vm.text,
        fontFamily: vm.exportModalFontFamily,
        fontSize: vm.fontSize,
        lineHeight: vm.lineHeight,
        letterSpacing: vm.letterSpacing,
        textColor: vm.textColor,
        backgroundColor: vm.backgroundColor,
        waterfallExportMeta: vm.waterfallExportMeta,
      },
      generate: {
        isOpen: vm.isGenerateModalOpen,
        onClose: vm.onCloseGenerateModal,
        selectedFont: vm.selectedFont,
        variableSettings: vm.variableSettings,
        generateStaticFontFile: vm.generateStaticFontFile,
        downloadFile: vm.downloadFile,
      },
      libraryShare: {
        open: vm.libraryShareDialogOpen,
        onClose: vm.closeLibraryShareDialog,
        library: vm.libraryShareSnapshot,
        initialSelectedFontIds: vm.libraryShareSeedIds,
        resolveSessionFont: vm.resolveSessionFontForLibraryEntry,
      },
    },
    fileUpload: {
      inputRef: vm.fileInputRef as React.RefObject<HTMLInputElement | null>,
      onChange: vm.handleFileUpload as EditorHomeLayoutProps['fileUpload']['onChange'],
    },
    sidebar: {
      activeSavedLibrary: vm.activeSavedLibrary,
      pickFont: vm.pickFont,
      fontLibraries: vm.fontLibraries,
      onOpenFontLibrary: vm.openSavedLibrary,
      onCreateFontLibrary: vm.handleCreateSavedLibrary,
      onUpdateFontLibrary: vm.handleUpdateSavedLibrary,
      onDeleteFontLibrary: vm.handleDeleteSavedLibrary,
      onReorderFontLibraries: vm.reorderFontLibraries,
      onAddFontToLibrary: vm.addFontEntryToLibrary,
      requestOpenCreateLibrary: vm.requestOpenCreateLibrary,
      requestOpenEditLibrary: vm.requestOpenEditLibrary,
      openCreateLibrarySignal: vm.openCreateLibrarySignal,
      setOpenCreateLibrarySignal: vm.setOpenCreateLibrarySignal,
      onShareLibrary: vm.openLibraryShareDialog,
      handleVariableSettingsChange: vm.handleVariableSettingsChange,
      availableStyles: vm.availableStyles,
      selectedPresetName: vm.selectedPresetName,
      applyPresetStyle: vm.applyPresetStyle,
      catalogSubsetOptions: vm.catalogSubsetOptions,
      activeCatalogSubset: vm.activeCatalogSubset,
      onCatalogSubsetChange: vm.applyCatalogSubset,
      getVariableAxes: vm.getVariableAxes,
      variableSettings: vm.variableSettings,
      resetVariableSettings: vm.resetVariableSettings,
    },
    tabBar: {
      mainTab: vm.mainTab,
      emptySlotIds: vm.emptySlotIds,
      emptySlotLabelsById: vm.emptySlotLabelsById,
      fontsVisibleInTabBar: vm.fontsVisibleInTabBar,
      fontTabPlaceholders: vm.fontTabPlaceholders,
      catalogPreviewSlotsById: vm.catalogPreviewSlotsById,
      openAllFontsTab: vm.openAllFontsTab,
      handleRemoveEmptySlot: vm.handleRemoveEmptySlot,
      addEmptyPreviewSlot: vm.addEmptyPreviewSlot,
      closeFontTab: vm.closeFontTab,
      setMainTab: vm.setMainTab,
      setClosedLibraryFontIds: vm.setClosedLibraryFontIds,
      safeSelectFont: vm.safeSelectFont,
      setSelectedFont: vm.setSelectedFont,
      tabBarEndActions,
    },
    preview: {
      sidebarSelectedFont: vm.sidebarSelectedFont,
      variableSettings: vm.variableSettings,
      exportedFont: vm.exportedFont,
      plainPreviewOpen: vm.plainPreviewOpen,
      closePlainPreview: vm.closePlainPreview,
      getFontFamily: vm.getFontFamily,
      getVariationSettings: vm.getVariationSettings,
      handleFontsUploadedWithNav: vm.handleFontsUploadedWithNav,
      selectOrAddFontsourceFontWithNav: vm.selectOrAddFontsourceFontWithNav,
      fontCssProperties: vm.fontCssProperties,
      fontLibraries: vm.fontLibraries,
      moveFontEntryToLibrary: vm.moveFontEntryToLibrary,
      requestCreateLibraryWithFonts: vm.requestCreateLibraryWithFonts,
      handleEmptyTabSelectionActionsChange: vm.handleEmptyTabSelectionActionsChange,
      isAnimating: vm.isAnimating,
      toggleAnimation: vm.toggleAnimation,
      liveWaterfallBaseSize: vm.liveWaterfallBaseSize,
      handleWaterfallBaseSizeLiveChange: vm.handleWaterfallBaseSizeLiveChange,
      handleWaterfallBaseSizeCommit: vm.handleWaterfallBaseSizeCommit,
      openGoogleCatalogEntryInEditorTab: vm.openGoogleCatalogEntryInEditorTab,
    },
    libraryScreenProps: {
      libraryTabs: vm.libraryTabs,
      fontsLibraryTab: vm.fontsLibraryTab,
      setFontsLibraryTab: vm.setFontsLibraryTab,
      handleLibraryTabDragOver: vm.handleLibraryTabDragOver,
      handleLibraryTabDrop: vm.handleLibraryTabDrop,
      libraryDropTargetTabId: vm.libraryDropTargetTabId,
      setLibraryDropTargetTabId: vm.setLibraryDropTargetTabId,
      fonts: vm.fonts,
      fontLibraries: vm.fontLibraries,
      addFontEntryToLibrary: vm.addFontEntryToLibrary,
      requestCreateLibraryWithFonts: vm.requestCreateLibraryWithFonts,
      openGoogleCatalogEntryInEditorTab: vm.openGoogleCatalogEntryInEditorTab,
      openFontsourceSlugInEditorTab: vm.openFontsourceSlugInEditorTab,
      openFontshareSlugInEditorTab: vm.openFontshareSlugInEditorTab,
      onOpenFontfabricTrialPage: vm.openFontfabricTrialPage,
      onUploadFontfabricTrial: vm.onUploadFontfabricTrial,
      handleCatalogSelectionActionsChange: vm.handleCatalogSelectionActionsChange,
      activeSavedLibrary: vm.activeSavedLibrary,
      savedLibraryToolbarIsWideRow: vm.savedLibraryToolbarIsWideRow,
      savedLibrarySearchWrapRef: vm.savedLibrarySearchWrapRef,
      savedLibraryFontsScope: vm.savedLibraryFontsScope,
      setSavedLibraryFontsScope: vm.setSavedLibraryFontsScope,
      activeSavedLibraryScopeOptions: vm.activeSavedLibraryScopeOptions,
      savedLibrarySearchActive: vm.savedLibrarySearchActive,
      savedLibrarySearchOverlayEnabled: vm.savedLibrarySearchOverlayEnabled,
      savedLibrarySearchInputRef: vm.savedLibrarySearchInputRef,
      savedLibrarySearchQuery: vm.savedLibrarySearchQuery,
      setSavedLibrarySearchQuery: vm.setSavedLibrarySearchQuery,
      setIsSavedLibrarySearchExpanded: vm.setIsSavedLibrarySearchExpanded,
      handleSavedLibrarySearchBlur: vm.handleSavedLibrarySearchBlur,
      savedLibrarySearchQueryTrimmed: vm.savedLibrarySearchQueryTrimmed,
      clearSavedLibrarySearchTextOnly: vm.clearSavedLibrarySearchTextOnly,
      clearSavedLibrarySearch: vm.clearSavedLibrarySearch,
      savedLibraryShareButton: vm.savedLibraryShareButton,
      savedLibrarySearchDesktopControls: vm.savedLibrarySearchDesktopControls,
      savedLibraryFilterVariable: vm.savedLibraryFilterVariable,
      setSavedLibraryFilterVariable: vm.setSavedLibraryFilterVariable,
      savedLibraryVariableOptions: vm.savedLibraryVariableOptions,
      savedLibraryFilterSubsets: vm.savedLibraryFilterSubsets,
      setSavedLibraryFilterSubsets: vm.setSavedLibraryFilterSubsets,
      savedLibrarySubsetOptions: vm.savedLibrarySubsetOptions,
      savedLibraryFilterItalic: vm.savedLibraryFilterItalic,
      setSavedLibraryFilterItalic: vm.setSavedLibraryFilterItalic,
      savedLibraryToolbarViewportW: vm.savedLibraryToolbarViewportW,
      savedLibraryToolbarIsTightResetGap: vm.savedLibraryToolbarIsTightResetGap,
      resetSavedLibraryFilters: vm.resetSavedLibraryFilters,
      savedLibraryHasAdvancedFilters: vm.savedLibraryHasAdvancedFilters,
      savedLibraryResetLabel: vm.savedLibraryResetLabel,
      renderSavedLibrarySearchToggleButton: vm.renderSavedLibrarySearchToggleButton,
      openSavedLibrarySearch: vm.openSavedLibrarySearch,
      activeSavedLibraryScopeCounts: vm.activeSavedLibraryScopeCounts,
      savedLibraryToolbarIs4Col: vm.savedLibraryToolbarIs4Col,
      savedLibraryToolbarIs2Col: vm.savedLibraryToolbarIs2Col,
      savedLibraryToolbarIs5Col: vm.savedLibraryToolbarIs5Col,
      savedLibrarySearchInlineButton: vm.savedLibrarySearchInlineButton,
      savedLibrarySearchMobileExpandedControls: vm.savedLibrarySearchMobileExpandedControls,
      activeSavedLibraryItems: vm.activeSavedLibraryItems,
      activeSavedLibraryCatalogItems: vm.activeSavedLibraryCatalogItems,
      filteredActiveSavedLibraryFonts: vm.filteredActiveSavedLibraryFonts,
      selectedSavedLibraryFontIds: vm.selectedSavedLibraryFontIds,
      handleMoveLibraryFont: vm.handleMoveLibraryFont,
      setFileUploadTarget: vm.setFileUploadTarget,
      fileInputRef: vm.fileInputRef,
      libraryStatusBar: vm.libraryStatusBar,
    },
    libraryCreateDialog: {
      sessionFonts: vm.fonts,
      libraries: vm.fontLibraries,
      openRequest: vm.libraryCreateDialogRequest,
      onOpenRequestHandled: vm.onLibraryCreateDialogHandled,
      openCreateLibrarySignal: vm.openCreateLibrarySignal,
      onCreateLibrary: vm.handleCreateSavedLibrary,
      onUpdateLibrary: vm.handleUpdateSavedLibrary,
      onOpenLibrary: vm.openSavedLibrary,
    },
  };
}
