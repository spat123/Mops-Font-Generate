import React, { useMemo } from 'react';
import { CatalogTopToolbar } from './CatalogTopToolbar';
import { CatalogSearchField } from './CatalogSearchField';
import { CatalogSearchButton } from './CatalogSearchButton';
import { CatalogTextSortControls } from './CatalogTextSortControls';
import { CatalogGridModeToggle } from './CatalogGridModeToggle';
import { CatalogCheckboxControl } from './CatalogCheckbox';
import { CustomSelect } from './CustomSelect';
import {
  NATIVE_SELECT_FIELD_INTERACTIVE,
  customSelectTriggerClass,
} from './nativeSelectFieldClasses';

export function CatalogPanelToolbar({
  trailingToolbar = null,
  trailingContainerRef,
  viewportW = 0,
  toolbarAlignToGrid = false,
  oneCardWidthPx = null,

  searchId,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchCount,
  searchCountSuffix,
  onSearchFocusChange,
  searchActionDisabled = false,

  categoryFilterId,
  categoryValue,
  onCategoryChange,
  categoryOptions = [],

  variableFilterId,
  variableValue,
  onVariableChange,
  variableOptions = [
    { value: 'variable', label: 'Вариативные' },
    { value: 'static', label: 'Статические' },
  ],

  subsetFilterId,
  subsetValue,
  onSubsetChange,
  subsetOptions = [],

  italicOnly,
  onItalicOnlyChange,
  italicLabel = 'Курсив',

  sortValue,
  onSortChange,
  sortOptions = [],

  gridViewMode,
  onGridViewModeChange,

  hasActiveFilters = false,
  onClearFilters,
  clearFiltersButtonClassName = 'box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm font-semibold uppercase text-accent disabled:cursor-default disabled:opacity-40 disabled:text-gray-900',
}) {
  const fieldInteractive = NATIVE_SELECT_FIELD_INTERACTIVE;
  const gridGapPx = 16;
  const halfCardWidthPx = toolbarAlignToGrid && oneCardWidthPx != null ? oneCardWidthPx / 2 : null;
  const cardWidthStyle =
    toolbarAlignToGrid && oneCardWidthPx != null ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined;
  const twoCardWidthStyle =
    toolbarAlignToGrid && oneCardWidthPx != null
      ? { width: oneCardWidthPx * 2 + gridGapPx, maxWidth: '100%' }
      : undefined;
  const mdSearchButtonStyle =
    toolbarAlignToGrid && oneCardWidthPx != null
      ? { minWidth: oneCardWidthPx, width: oneCardWidthPx, maxWidth: '100%' }
      : undefined;
  const halfRowWidthStyle = { width: 'calc(50% - 8px)', maxWidth: '100%' };
  const selectClass = useMemo(
    () => (placeholderMuted) => customSelectTriggerClass({ placeholderMuted }),
    [],
  );
  const toolbarMode =
    viewportW > 1940 ? 'xl' : viewportW > 1440 ? 'lg' : viewportW > 1280 ? 'md' : viewportW >= 767 ? 'sm' : 'xs';
  const isXl = toolbarMode === 'xl';
  const isLg = toolbarMode === 'lg';
  const isMd = toolbarMode === 'md';
  const isSm = toolbarMode === 'sm';
  const sortGapClass = isLg ? 'gap-x-3 gap-y-1.5' : 'gap-4';
  const afterActionsGapClass = isLg ? 'gap-2' : 'gap-4';
  const sortItemPaddingClass = isLg ? 'px-0.5' : 'px-1';
  const clearFiltersClass = `${clearFiltersButtonClassName} ${isLg ? 'px-1.5' : ''}`.trim();

  const searchControl = (
    <CatalogSearchField
      id={searchId}
      value={searchValue}
      onChange={onSearchChange}
      placeholder={searchPlaceholder}
      count={searchCount}
      countSuffix={searchCountSuffix}
      inputInteractiveClassName={fieldInteractive}
      onFocusChange={onSearchFocusChange}
    />
  );

  const searchButtonControl = <CatalogSearchButton disabled={searchActionDisabled} iconOnly={isSm} />;

  const categoryControl = (
    <CustomSelect
      id={categoryFilterId}
      value={categoryValue}
      onChange={onCategoryChange}
      clearable
      className={selectClass(!categoryValue)}
      aria-label="Категория"
      clearAriaLabel="Очистить фильтр категории"
      placeholder="Категория"
      emptyValue=""
      options={categoryOptions}
    />
  );

  const variableControl = (
    <CustomSelect
      id={variableFilterId}
      value={variableValue}
      onChange={onVariableChange}
      clearable
      className={selectClass(variableValue === 'all')}
      aria-label="Вариативность"
      clearAriaLabel="Очистить фильтр вариативности"
      placeholder="Вариативность"
      emptyValue="all"
      options={variableOptions}
    />
  );

  const subsetControl = (
    <CustomSelect
      id={subsetFilterId}
      value={subsetValue}
      onChange={onSubsetChange}
      multiple
      clearable
      className={selectClass(Array.isArray(subsetValue) ? subsetValue.length === 0 : !subsetValue)}
      aria-label="Языки / наборы"
      clearAriaLabel="Очистить фильтр языков"
      placeholder="Языки"
      searchable
      searchPlaceholder="Поиск языка"
      options={subsetOptions}
    />
  );

  const italicControlNode = (
    <CatalogCheckboxControl checked={italicOnly} onChange={onItalicOnlyChange} label={italicLabel} />
  );

  const sortButtonsControl = (
    <CatalogTextSortControls
      sortValue={sortValue}
      onSortChange={onSortChange}
      sortOptions={sortOptions}
      showResetButton={false}
      className={`flex flex-wrap items-center ${sortGapClass}`}
      itemClassName={`box-border h-10 shrink-0 whitespace-nowrap bg-transparent text-sm uppercase font-semibold transition-colors ${sortItemPaddingClass}`}
    />
  );

  const sortSelectControl = (
    <CustomSelect
      value={sortValue}
      onChange={onSortChange}
      className={selectClass(false)}
      aria-label="Сортировка"
      options={sortOptions}
    />
  );

  const clearFiltersButton = (
    <button
      type="button"
      disabled={!hasActiveFilters}
      onClick={onClearFilters}
      className={clearFiltersClass}
    >
      Сбросить все
    </button>
  );

  const gridToggleControl = <CatalogGridModeToggle value={gridViewMode} onChange={onGridViewModeChange} />;
  const splitAfterActions = (
    <div className="flex w-full items-center gap-4">
      <div className="min-w-0" style={halfRowWidthStyle}>
        {clearFiltersButton}
      </div>
      <div className="ml-auto shrink-0">{gridToggleControl}</div>
    </div>
  );

  const afterActions = (
    <div className={`flex items-center ${afterActionsGapClass}`}>
      {clearFiltersButton}
      {gridToggleControl}
    </div>
  );

  if (isXl) {
    return (
      <CatalogTopToolbar
        trailingToolbar={trailingToolbar}
        trailingContainerRef={trailingContainerRef}
        trailingContainerClassName="min-w-0 w-full sm:w-auto"
        trailingContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
        searchContainerClassName="relative min-w-0 w-full sm:flex-1"
        searchActionContainerClassName="min-w-0 w-full sm:w-auto flex shrink-0 items-center"
        searchActionContainerStyle={halfCardWidthPx != null ? { width: halfCardWidthPx, maxWidth: '100%' } : undefined}
        searchActionControl={searchButtonControl}
        primaryFiltersContainerClassName="min-w-0 w-full sm:w-auto sm:min-w-[18rem]"
        primaryFiltersContainerStyle={cardWidthStyle}
        secondaryFiltersContainerClassName="min-w-0 w-full sm:w-auto sm:min-w-[14rem]"
        secondaryFiltersContainerStyle={cardWidthStyle}
        searchControl={searchControl}
        primaryFiltersControl={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {categoryControl}
            {variableControl}
          </div>
        }
        secondaryFiltersControl={subsetControl}
        italicControl={italicControlNode}
        actionsControl={sortButtonsControl}
        afterActionsControl={afterActions}
      />
    );
  }

  if (isLg) {
    return (
      <div className="flex shrink-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {trailingToolbar ? (
            <div ref={trailingContainerRef} className="min-w-0 w-full sm:w-auto" style={cardWidthStyle}>
              {trailingToolbar}
            </div>
          ) : null}
          <div className="relative min-w-0 flex-1">{searchControl}</div>
          <div className="flex shrink-0 items-center" style={halfCardWidthPx != null ? { width: halfCardWidthPx, maxWidth: '100%' } : undefined}>
            {searchButtonControl}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0" style={cardWidthStyle}>{categoryControl}</div>
          <div className="min-w-0" style={cardWidthStyle}>{variableControl}</div>
          <div className="min-w-0" style={cardWidthStyle}>{subsetControl}</div>
          <div className="min-w-0" style={cardWidthStyle}>{italicControlNode}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">{sortButtonsControl}</div>
          <div className="shrink-0">{afterActions}</div>
        </div>
      </div>
    );
  }

  if (isMd) {
    return (
      <div className="flex shrink-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {trailingToolbar ? (
            <div ref={trailingContainerRef} className="min-w-0" style={twoCardWidthStyle}>
              {trailingToolbar}
            </div>
          ) : null}
          <div className="relative min-w-0 flex-1">{searchControl}</div>
          <div className="flex shrink-0 items-center" style={mdSearchButtonStyle}>
            {searchButtonControl}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0" style={cardWidthStyle}>{categoryControl}</div>
          <div className="min-w-0" style={cardWidthStyle}>{variableControl}</div>
          <div className="min-w-0" style={cardWidthStyle}>{subsetControl}</div>
          <div className="min-w-0" style={cardWidthStyle}>{italicControlNode}</div>
          <div className="min-w-0" style={cardWidthStyle}>{sortSelectControl}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="shrink-0">{clearFiltersButton}</div>
          <div className="shrink-0">{gridToggleControl}</div>
        </div>
      </div>
    );
  }

  if (isSm) {
    return (
      <div className="flex shrink-0 flex-col gap-4">
        {trailingToolbar ? (
          <div ref={trailingContainerRef} className="min-w-0 w-full">
            {trailingToolbar}
          </div>
        ) : null}
        <div className="flex items-center gap-4">
          <div className="relative min-w-0 flex-1">{searchControl}</div>
          <div className="flex shrink-0 items-center">{searchButtonControl}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">{categoryControl}</div>
          <div className="min-w-0 flex-1">{variableControl}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">{subsetControl}</div>
          <div className="min-w-0 flex-1">{italicControlNode}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="min-w-0" style={halfRowWidthStyle}>{sortSelectControl}</div>
          <div className="min-w-0 flex-1">{splitAfterActions}</div>
        </div>
      </div>
    );
  }

  return (
    <CatalogTopToolbar
      trailingToolbar={trailingToolbar}
      trailingContainerRef={trailingContainerRef}
      trailingContainerClassName="min-w-0 w-full sm:w-auto"
      trailingContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
      searchContainerClassName="relative min-w-0 w-full sm:flex-1"
      searchActionContainerClassName="min-w-0 w-full sm:w-auto flex shrink-0 items-center"
      searchActionContainerStyle={halfCardWidthPx != null ? { width: halfCardWidthPx, maxWidth: '100%' } : undefined}
      searchActionControl={searchButtonControl}
      primaryFiltersContainerClassName="min-w-0 w-full sm:w-auto sm:min-w-[18rem]"
      primaryFiltersContainerStyle={cardWidthStyle}
      secondaryFiltersContainerClassName="min-w-0 w-full sm:w-auto sm:min-w-[14rem]"
      secondaryFiltersContainerStyle={cardWidthStyle}
      searchControl={searchControl}
      primaryFiltersControl={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {categoryControl}
          {variableControl}
        </div>
      }
      secondaryFiltersControl={subsetControl}
      italicControl={italicControlNode}
      actionsControl={sortButtonsControl}
      afterActionsControl={afterActions}
    />
  );
}
