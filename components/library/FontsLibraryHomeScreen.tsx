import { memo } from 'react';
import UnifiedCatalogPanel from '../catalog/UnifiedCatalogPanel';
import type { FontsLibraryHomeScreenProps } from '../../types/libraryScreens';
import { UnderlineTab } from '../ui/UnderlineTab';
import { ScopeFilterToolbar } from '../ui/ScopeFilterToolbar';
import { CustomSelect } from '../ui/CustomSelect';
import { customSelectTriggerClass } from '../ui/nativeSelectFieldClasses';
import { CatalogCheckboxControl } from '../catalog/CatalogCheckbox';
import { UploadFromDiskCard } from '../ui/UploadFromDiskCard';
import { SortableFontCardGrid } from '../ui/SortableFontCardGrid';
import { SearchClearButton } from '../ui/SearchClearButton';
import { IconCircleButton } from '../ui/IconCircleButton';
import { LibraryReorderHint } from '../ui/LibraryReorderHint';
import { EditorStatusBar } from '../ui/EditorStatusBar';

/**
 * Экран «Все шрифты»: подвкладки каталог / сохранённые библиотеки, панели каталога, сетка библиотеки, статусбар.
 * Состояние и обработчики остаются в `pages/index.jsx`.
 */
export const FontsLibraryHomeScreen = memo(function FontsLibraryHomeScreen({
  screenActive = true,
  libraryTabs,
  fontsLibraryTab,
  setFontsLibraryTab,
  handleLibraryTabDragOver,
  handleLibraryTabDrop,
  libraryDropTargetTabId,
  setLibraryDropTargetTabId,
  fonts,
  fontLibraries,
  addFontEntryToLibrary,
  requestCreateLibraryWithFonts,
  openGoogleCatalogEntryInEditorTab,
  openFontsourceSlugInEditorTab,
  openFontshareSlugInEditorTab,
  onOpenFontfabricTrialPage,
  onUploadFontfabricTrial,
  handleCatalogSelectionActionsChange,
  activeSavedLibrary,
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
  selectedSavedLibraryFontIds,
  handleMoveLibraryFont,
  setFileUploadTarget,
  fileInputRef,
  libraryStatusBar,
}: FontsLibraryHomeScreenProps & { screenActive?: boolean }) {
  const isCatalogPanelActive = Boolean(screenActive && fontsLibraryTab === 'catalog');
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      {libraryTabs.length > 1 ? (
        <div className="flex shrink-0 overflow-x-auto border-b border-gray-200 px-6 pt-6">
          {libraryTabs.map((tab) => (
            <UnderlineTab
              key={tab.id}
              isActive={fontsLibraryTab === tab.id}
              onClick={() => setFontsLibraryTab(tab.id)}
              onDragOver={tab.id === 'catalog' ? undefined : (event) => handleLibraryTabDragOver(event, tab.id)}
              onDrop={tab.id === 'catalog' ? undefined : (event) => handleLibraryTabDrop(event, tab.id)}
              onDragLeave={
                tab.id === 'catalog'
                  ? undefined
                  : () => setLibraryDropTargetTabId((prev) => (prev === tab.id ? null : prev))
              }
              className={libraryDropTargetTabId === tab.id ? 'border-b-2 border-black text-black' : ''}
            >
              {tab.label}
            </UnderlineTab>
          ))}
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-6 pt-6">
        <div
          className={
            fontsLibraryTab === 'catalog'
              ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
              : 'hidden'
          }
          aria-hidden={fontsLibraryTab !== 'catalog'}
        >
          <UnifiedCatalogPanel
            isActive={isCatalogPanelActive}
            fonts={fonts}
            fontLibraries={fontLibraries}
            onAddFontToLibrary={addFontEntryToLibrary}
            onRequestCreateLibrary={requestCreateLibraryWithFonts}
            onOpenGoogleEntryInEditorTab={openGoogleCatalogEntryInEditorTab}
            onOpenFontsourceInEditorTab={openFontsourceSlugInEditorTab}
            onOpenFontshareInEditorTab={openFontshareSlugInEditorTab}
            onOpenTrialPage={onOpenFontfabricTrialPage}
            onUploadTrial={onUploadFontfabricTrial}
            onSelectionActionsChange={handleCatalogSelectionActionsChange}
          />
        </div>

        {activeSavedLibrary && (
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-7">
            {savedLibraryToolbarIsWideRow ? (
              <div className="shrink-0 pb-4">
                <div className="relative">
                  <div className="grid max-w-full grid-cols-5 items-center gap-4">
                    <div className="min-w-0">
                      <CustomSelect
                        id="saved-library-fonts-scope"
                        value={savedLibraryFontsScope}
                        onChange={setSavedLibraryFontsScope}
                        className={customSelectTriggerClass()}
                        aria-label={`Показать шрифты в библиотеке ${activeSavedLibrary.name}`}
                        options={activeSavedLibraryScopeOptions}
                      />
                    </div>
                    <div
                      className={`min-w-0 transition-opacity duration-300 ${
                        savedLibrarySearchActive ? 'pointer-events-none opacity-0' : 'opacity-100'
                      }`}
                    >
                      <CustomSelect
                        id="saved-library-filter-variable"
                        value={savedLibraryFilterVariable}
                        onChange={setSavedLibraryFilterVariable}
                        className={customSelectTriggerClass({
                          placeholderMuted: String(savedLibraryFilterVariable || 'all') === 'all',
                        })}
                        aria-label="Вариативность"
                        placeholder="Вариативность"
                        emptyValue="all"
                        clearable
                        clearAriaLabel="Очистить фильтр вариативности"
                        options={savedLibraryVariableOptions}
                      />
                    </div>
                    <div
                      className={`min-w-0 transition-opacity duration-300 ${
                        savedLibrarySearchActive ? 'pointer-events-none opacity-0' : 'opacity-100'
                      }`}
                    >
                      <CustomSelect
                        id="saved-library-filter-subsets"
                        value={savedLibraryFilterSubsets}
                        onChange={setSavedLibraryFilterSubsets}
                        className={customSelectTriggerClass({
                          placeholderMuted:
                            !Array.isArray(savedLibraryFilterSubsets) ||
                            savedLibraryFilterSubsets.length === 0,
                        })}
                        aria-label="Языки"
                        placeholder="Языки"
                        multiple
                        searchable
                        clearable
                        clearAriaLabel="Очистить фильтр языков"
                        searchPlaceholder="Поиск языка"
                        options={savedLibrarySubsetOptions}
                      />
                    </div>
                    <div
                      className={`min-w-0 transition-opacity duration-300 ${
                        savedLibrarySearchActive ? 'pointer-events-none opacity-0' : 'opacity-100'
                      }`}
                    >
                      <CatalogCheckboxControl
                        checked={savedLibraryFilterItalic}
                        onChange={(next) => setSavedLibraryFilterItalic(next)}
                        label="Курсив"
                        inline={savedLibraryToolbarViewportW > 1440}
                      />
                    </div>
                    <div className="relative flex min-w-0 items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={resetSavedLibraryFilters}
                        disabled={
                          !savedLibraryHasAdvancedFilters &&
                          String(savedLibraryFontsScope || 'all') === 'all' &&
                          !savedLibrarySearchQueryTrimmed
                        }
                        className={`box-border h-10 whitespace-nowrap px-2 text-sm font-semibold uppercase text-accent transition-all duration-300 disabled:cursor-default disabled:opacity-40 disabled:text-gray-900 ${
                          savedLibrarySearchActive
                            ? 'pointer-events-none w-0 min-w-0 flex-none overflow-hidden p-0 opacity-0'
                            : 'min-w-0 flex-1 opacity-100'
                        }`}
                      >
                        {savedLibraryResetLabel}
                      </button>
                      {savedLibrarySearchCol5Trailing}
                    </div>
                  </div>
                  <div
                    className={`absolute inset-y-0 z-10 flex min-w-0 items-center overflow-hidden transition-opacity duration-300 ${
                      savedLibrarySearchActive
                        ? 'pointer-events-auto bg-white opacity-100'
                        : 'pointer-events-none opacity-0'
                    }`}
                    style={{
                      left: 'calc((100% - 4 * 1rem) / 5 + 1rem)',
                      // 2× кнопка (2.5rem) + 2× gap-2 (0.5rem): между полем и «Закрыть», между «Закрыть» и «Поделиться»
                      right: 'calc(2.5rem + 0.5rem + 2.5rem + 0.5rem)',
                    }}
                  >
                    {savedLibrarySearchExpandField}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <ScopeFilterToolbar
                  id="saved-library-fonts-scope"
                  value={savedLibraryFontsScope}
                  onChange={setSavedLibraryFontsScope}
                  options={activeSavedLibraryScopeOptions}
                  ariaLabel={`Показать шрифты в библиотеке ${activeSavedLibrary.name}`}
                  gridClassName={
                    savedLibraryToolbarIs4Col
                      ? 'grid max-w-full grid-cols-4 gap-4'
                      : savedLibraryToolbarIs2Col
                        ? 'grid max-w-full grid-cols-2 gap-4'
                        : 'grid max-w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                  }
                  selectCellClassName={savedLibraryToolbarIs4Col ? 'col-span-2 min-w-0' : 'min-w-0'}
                  trailingCellClassName={
                    savedLibraryToolbarIs4Col
                      ? 'col-start-3 col-span-2 flex min-w-0 justify-end'
                      : savedLibraryToolbarIs2Col
                        ? 'col-start-2 col-span-1 flex min-w-0 justify-end'
                        : 'col-start-2 col-span-1 md:col-start-2 md:col-span-2 lg:col-start-2 lg:col-span-3 xl:col-start-2 xl:col-span-4 flex min-w-0 justify-end'
                  }
                  trailing={
                    savedLibrarySearchOverlayEnabled
                      ? savedLibrarySearchActive
                        ? null
                        : savedLibraryToolbarIs4Col
                          ? (
                              <div className="flex min-w-0 flex-1 items-center gap-4">
                                <div className="min-w-0 flex-1">
                                  <CustomSelect
                                    id="saved-library-filter-subsets-top"
                                    value={savedLibraryFilterSubsets}
                                    onChange={setSavedLibraryFilterSubsets}
                                    className={customSelectTriggerClass({
                                      placeholderMuted:
                                        !Array.isArray(savedLibraryFilterSubsets) ||
                                        savedLibraryFilterSubsets.length === 0,
                                    })}
                                    aria-label="Языки"
                                    placeholder="Языки"
                                    multiple
                                    searchable
                                    clearable
                                    clearAriaLabel="Очистить фильтр языков"
                                    searchPlaceholder="Поиск языка"
                                    options={savedLibrarySubsetOptions}
                                  />
                                </div>
                                <div className="shrink-0">{savedLibrarySearchInlineButton}</div>
                              </div>
                            )
                          : savedLibrarySearchInlineButton
                      : savedLibrarySearchDesktopControls
                  }
                  trailingOverlay={
                    savedLibrarySearchOverlayEnabled ? savedLibrarySearchMobileExpandedControls : null
                  }
                />
                <div className="shrink-0 pb-4">
                  <div
                    className={`grid max-w-full gap-4 ${
                      savedLibraryToolbarIs5Col
                        ? 'grid-cols-5'
                        : savedLibraryToolbarIs4Col
                          ? 'grid-cols-4'
                          : savedLibraryToolbarIs2Col
                            ? 'grid-cols-2'
                            : 'grid-cols-5'
                    }`}
                  >
                    {!savedLibraryToolbarIs4Col ? (
                      <div className="col-span-2 min-w-0">
                        <CustomSelect
                          id="saved-library-filter-subsets"
                          value={savedLibraryFilterSubsets}
                          onChange={setSavedLibraryFilterSubsets}
                          className={customSelectTriggerClass({
                            placeholderMuted:
                              !Array.isArray(savedLibraryFilterSubsets) ||
                              savedLibraryFilterSubsets.length === 0,
                          })}
                          aria-label="Языки"
                          placeholder="Языки"
                          multiple
                          searchable
                          clearable
                          clearAriaLabel="Очистить фильтр языков"
                          searchPlaceholder="Поиск языка"
                          options={savedLibrarySubsetOptions}
                        />
                      </div>
                    ) : null}
                    <div className={savedLibraryToolbarIs4Col ? 'col-span-2 min-w-0' : 'min-w-0'}>
                      <CustomSelect
                        id="saved-library-filter-variable"
                        value={savedLibraryFilterVariable}
                        onChange={setSavedLibraryFilterVariable}
                        className={customSelectTriggerClass({
                          placeholderMuted: String(savedLibraryFilterVariable || 'all') === 'all',
                        })}
                        aria-label="Вариативность"
                        placeholder="Вариативность"
                        emptyValue="all"
                        clearable
                        clearAriaLabel="Очистить фильтр вариативности"
                        options={savedLibraryVariableOptions}
                      />
                    </div>
                    <div className="min-w-0">
                      <CatalogCheckboxControl
                        checked={savedLibraryFilterItalic}
                        onChange={(next) => setSavedLibraryFilterItalic(next)}
                        label="Курсив"
                      />
                    </div>
                    <div
                      className={
                        savedLibraryToolbarIs4Col ? 'flex min-w-0 items-center justify-end' : 'min-w-0'
                      }
                    >
                      <button
                        type="button"
                        onClick={resetSavedLibraryFilters}
                        disabled={
                          !savedLibraryHasAdvancedFilters &&
                          String(savedLibraryFontsScope || 'all') === 'all' &&
                          !savedLibrarySearchQueryTrimmed
                        }
                        className={
                          savedLibraryToolbarIs4Col
                            ? 'box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm font-semibold uppercase text-accent disabled:cursor-default disabled:opacity-40 disabled:text-gray-900'
                            : 'box-border h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold uppercase text-gray-900 transition-colors hover:bg-black/[0.9] hover:border-black/[0.9] hover:text-white disabled:cursor-default disabled:opacity-40'
                        }
                      >
                        {savedLibraryToolbarIs4Col ? 'Сбросить все' : savedLibraryResetLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="catalog-scroll-area min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-10">
              {savedLibrarySearchQueryTrimmed ? (
                activeSavedLibraryItems.length === 0 && activeSavedLibraryCatalogItems.length === 0 ? (
                  <p className="py-4 text-sm text-gray-500">Ничего не найдено.</p>
                ) : (
                  <div className="space-y-6">
                    {activeSavedLibraryItems.length > 0 ? (
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase text-gray-500">В библиотеке</div>
                        <SortableFontCardGrid
                          items={activeSavedLibraryItems}
                          draggable={false}
                          onMoveItem={undefined}
                          renderAfter={null}
                        />
                      </div>
                    ) : null}
                    {activeSavedLibraryCatalogItems.length > 0 ? (
                      <div>
                        <div className="mb-3 text-xs font-semibold uppercase text-gray-500">В каталоге</div>
                        <SortableFontCardGrid
                          items={activeSavedLibraryCatalogItems}
                          draggable={false}
                          onMoveItem={undefined}
                          renderAfter={null}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              ) : filteredActiveSavedLibraryFonts.length > 0 ||
                savedLibraryFontsScope === 'all' ||
                savedLibraryFontsScope === 'local' ? (
                <div>
                  <SortableFontCardGrid
                    items={activeSavedLibraryItems}
                    draggable={savedLibraryFontsScope === 'all' && selectedSavedLibraryFontIds.size === 0}
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
      <EditorStatusBar leading={libraryStatusBar.leading} center={libraryStatusBar.center} />
    </div>
  );
},
/**
 * Когда экран «Все шрифты» скрыт (открыта вкладка конкретного шрифта),
 * НЕ перерисовываем его на каждый тик (например, при перетаскивании осей VF),
 * чтобы тяжёлый каталог (facet maps / лицензии / search index) не пересчитывался в фоне.
 */
(prev, next) => {
  const prevActive = prev?.screenActive !== false;
  const nextActive = next?.screenActive !== false;
  if (!prevActive && !nextActive) return true;
  return false;
});
