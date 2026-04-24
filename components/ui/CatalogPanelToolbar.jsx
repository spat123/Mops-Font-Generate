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
  const halfCardWidthPx = toolbarAlignToGrid && oneCardWidthPx != null ? oneCardWidthPx / 2 : null;
  const selectClass = useMemo(
    () => (placeholderMuted) => customSelectTriggerClass({ placeholderMuted }),
    [],
  );

  return (
    <CatalogTopToolbar
      trailingToolbar={trailingToolbar}
      trailingContainerRef={trailingContainerRef}
      trailingContainerClassName="min-w-0 w-full sm:w-auto"
      trailingContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
      searchContainerClassName="relative min-w-0 w-full sm:flex-1"
      searchActionContainerClassName="min-w-0 w-full sm:w-auto flex shrink-0 items-center"
      searchActionContainerStyle={halfCardWidthPx != null ? { width: halfCardWidthPx, maxWidth: '100%' } : undefined}
      searchActionControl={<CatalogSearchButton disabled={searchActionDisabled} />}
      primaryFiltersContainerClassName="min-w-0 w-full sm:w-auto sm:min-w-[18rem]"
      primaryFiltersContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
      secondaryFiltersContainerClassName="min-w-0 w-full sm:w-auto sm:min-w-[14rem]"
      secondaryFiltersContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
      searchControl={
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
      }
      primaryFiltersControl={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
      }
      secondaryFiltersControl={
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
      }
      italicControl={
        <CatalogCheckboxControl checked={italicOnly} onChange={onItalicOnlyChange} label={italicLabel} />
      }
      actionsControl={
        <CatalogTextSortControls
          sortValue={sortValue}
          onSortChange={onSortChange}
          sortOptions={sortOptions}
          showResetButton={false}
        />
      }
      afterActionsControl={
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={onClearFilters}
            className={clearFiltersButtonClassName}
          >
            Сбросить все
          </button>
          <CatalogGridModeToggle value={gridViewMode} onChange={onGridViewModeChange} />
        </div>
      }
    />
  );
}

