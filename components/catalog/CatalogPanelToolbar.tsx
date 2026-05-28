import { useMemo, type ReactNode } from 'react';
import type { CatalogSelectOption } from '../../types/catalog';
import type { CatalogPanelToolbarPropsFromHook } from './useCatalogToolbarProps';
export type CatalogPanelToolbarProps = CatalogPanelToolbarPropsFromHook & {
  sourceFilterId?: string;
  sourceFilterValue?: string;
  onSourceFilterChange?: (value: string) => void;
  sourceFilterOptions?: CatalogSelectOption[] | null;
  sourceFilterAriaLabel?: string;
  italicLabel?: string;
};
import { CatalogTopToolbar } from './CatalogTopToolbar';
import { CatalogSearchField } from './CatalogSearchField';
import { CatalogSearchButton } from './CatalogSearchButton';
import { CatalogTextSortControls } from './CatalogTextSortControls';
import { CatalogGridModeToggle } from './CatalogGridModeToggle';
import { CatalogCheckboxControl } from './CatalogCheckbox';
import { CatalogPreviewSampleControls } from './CatalogPreviewSampleControls';
import { CatalogPreviewFontSizeSlider } from './CatalogPreviewFontSizeSlider';
import { CustomSelect, type CustomSelectOption } from '../ui/CustomSelect';
import {
  NATIVE_SELECT_FIELD_INTERACTIVE,
  customSelectTriggerClass,
} from '../ui/nativeSelectFieldClasses';

export function CatalogPanelToolbar({
  trailingToolbar = null,
  trailingContainerRef,
  viewportW = 0,
  toolbarAlignToGrid = false,
  oneCardWidthPx = null,

  sourceFilterId,
  sourceFilterValue,
  onSourceFilterChange,
  sourceFilterOptions = null,
  sourceFilterAriaLabel = 'Источник шрифтов',

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

  licenseFilterId,
  licenseValue,
  onLicenseChange,
  licenseOptions = [],

  feelingFilterId,
  feelingValue,
  onFeelingChange,
  feelingOptions = [],

  shapeFilterId,
  shapeValue,
  onShapeChange,
  shapeOptions = [],

  calligraphyFilterId,
  calligraphyValue,
  onCalligraphyChange,
  calligraphyOptions = [],

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
  roleFilterId,
  roleValue = '',
  onRoleChange,
  roleOptions = [],

  sortValue,
  onSortChange,
  sortOptions = [],

  gridViewMode,
  onGridViewModeChange,

  previewSamplePreset,
  onPreviewSamplePresetChange,
  previewCustomText,
  onPreviewCustomTextChange,
  previewFontSizePx,
  onPreviewFontSizePxChange,
  previewPresetFilterId,
  previewCustomTextId,

  hasActiveFilters = false,
  onClearFilters,
  clearFiltersButtonClassName = 'box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm font-semibold uppercase text-accent disabled:cursor-default disabled:opacity-40 disabled:text-gray-900',
}: CatalogPanelToolbarProps) {
  const pickSelectValue = (value: string | string[]) => (Array.isArray(value) ? value[0] ?? '' : value);
  const pickMultiSelectValue = (value: string | string[]) =>
    Array.isArray(value) ? value : value ? [value] : [];

  const fieldInteractive = NATIVE_SELECT_FIELD_INTERACTIVE;
  const gridGapPx = 16;
  const halfCardWidthPx = toolbarAlignToGrid && oneCardWidthPx != null ? oneCardWidthPx / 2 : null;
  const cardWidthStyle =
    toolbarAlignToGrid && oneCardWidthPx != null ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined;
  const twoCardWidthStyle =
    toolbarAlignToGrid && oneCardWidthPx != null
      ? { width: oneCardWidthPx * 2 + gridGapPx, maxWidth: '100%' }
      : undefined;
  const threeCardWidthStyle =
    toolbarAlignToGrid && oneCardWidthPx != null
      ? { width: oneCardWidthPx * 3 + gridGapPx * 2, maxWidth: '100%' }
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
    viewportW > 1940 ? 'xl' : viewportW > 1440 ? 'lg' : viewportW >= 1280 ? 'md' : viewportW >= 767 ? 'sm' : 'xs';
  const isXl = toolbarMode === 'xl';
  const isLg = toolbarMode === 'lg';
  const isMd = toolbarMode === 'md';
  const isSm = toolbarMode === 'sm';
  const sortGapClass = isLg ? 'gap-x-3 gap-y-1.5' : 'gap-4';
  const afterActionsGapClass = isLg ? 'gap-2' : 'gap-4';
  const sortItemPaddingClass = isLg ? 'px-0.5' : 'px-1';
  const isDesktopToolbar = viewportW >= 767;
  const useMdGridToolbar = isMd && toolbarAlignToGrid && oneCardWidthPx != null;
  const useTabletGridToolbar =
    viewportW >= 1024 && viewportW < 1280 && toolbarAlignToGrid && oneCardWidthPx != null;
  const useMobileGridToolbar =
    viewportW < 1024 && toolbarAlignToGrid && oneCardWidthPx != null;
  const useCompactGridToolbar = useMdGridToolbar || useTabletGridToolbar;
  const clearFiltersClass = [
    useCompactGridToolbar
      ? clearFiltersButtonClassName.replace(/\bpx-2\b/, 'px-0')
      : clearFiltersButtonClassName,
    isLg ? 'pr-2' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const useGridSearchWidth =
    toolbarAlignToGrid && isDesktopToolbar && twoCardWidthStyle && !useCompactGridToolbar;

  const searchButtonContainerStyle =
    useCompactGridToolbar && mdSearchButtonStyle
      ? mdSearchButtonStyle
      : halfCardWidthPx != null
        ? { width: halfCardWidthPx, maxWidth: '100%' }
        : undefined;

  /** Ширина кнопки «Искать» на сетке — та же для пресета «Имя» на широком десктопе. */
  const halfCardControlStyle = searchButtonContainerStyle;

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

  const searchWithButtonControl =
    useGridSearchWidth ? (
      <div className="flex min-w-0 shrink-0 items-center gap-4" style={twoCardWidthStyle}>
        <div className="relative min-w-0 flex-1">{searchControl}</div>
        <div className="flex shrink-0 items-center" style={searchButtonContainerStyle}>
          {searchButtonControl}
        </div>
      </div>
    ) : (
      <>
        <div className="relative min-w-0 w-full sm:flex-1">{searchControl}</div>
        <div className="flex shrink-0 items-center" style={searchButtonContainerStyle}>
          {searchButtonControl}
        </div>
      </>
    );

  const sortSelectControl = (
    <CustomSelect
      value={sortValue}
      onChange={(value) => onSortChange?.(pickSelectValue(value))}
      className={selectClass(false)}
      aria-label="Сортировка"
      options={sortOptions}
    />
  );

  const previewSampleControl = (
    <CatalogPreviewSampleControls
      presetId={previewPresetFilterId}
      presetValue={previewSamplePreset}
      onPresetChange={onPreviewSamplePresetChange}
      textId={previewCustomTextId}
      textValue={previewCustomText}
      onTextChange={onPreviewCustomTextChange}
      inputInteractiveClassName={fieldInteractive}
      selectClassName={selectClass(false)}
    />
  );

  const sourceFilterControl =
    Array.isArray(sourceFilterOptions) && sourceFilterOptions.length > 0 ? (
      <CustomSelect
        id={sourceFilterId}
        value={sourceFilterValue}
        onChange={(value) => onSourceFilterChange?.(pickSelectValue(value))}
        className={selectClass(false)}
        aria-label={sourceFilterAriaLabel}
        options={sourceFilterOptions as CustomSelectOption[]}
      />
    ) : null;

  const leadingToolbar = sourceFilterControl || trailingToolbar;

  const categoryControl = (
    <CustomSelect
      id={categoryFilterId}
      value={categoryValue}
      onChange={(value) => onCategoryChange?.(pickSelectValue(value))}
      clearable
      className={selectClass(!categoryValue)}
      aria-label="Категория"
      clearAriaLabel="Очистить фильтр категории"
      placeholder="Категория"
      emptyValue=""
      options={categoryOptions as CustomSelectOption[]}
    />
  );

  const licenseControl = (
    <CustomSelect
      id={licenseFilterId}
      value={licenseValue}
      onChange={(value) => onLicenseChange?.(pickSelectValue(value))}
      clearable
      className={selectClass(!licenseValue)}
      aria-label="Лицензия"
      clearAriaLabel="Очистить фильтр лицензии"
      placeholder="Лицензия"
      emptyValue=""
      options={licenseOptions as CustomSelectOption[]}
    />
  );

  const feelingControl = (
    <CustomSelect
      id={feelingFilterId}
      value={feelingValue}
      onChange={(value) => onFeelingChange?.(pickSelectValue(value))}
      clearable
      className={selectClass(!feelingValue)}
      aria-label="Настроение"
      clearAriaLabel="Очистить фильтр настроения"
      placeholder="Настроение"
      emptyValue=""
      options={feelingOptions as CustomSelectOption[]}
    />
  );

  const shapeControl = (
    <CustomSelect
      id={shapeFilterId}
      value={shapeValue}
      onChange={(value) => onShapeChange?.(pickSelectValue(value))}
      clearable
      className={selectClass(!shapeValue)}
      aria-label="Форма"
      clearAriaLabel="Очистить фильтр формы"
      placeholder="Форма"
      emptyValue=""
      options={shapeOptions as CustomSelectOption[]}
    />
  );

  const calligraphyControl = (
    <CustomSelect
      id={calligraphyFilterId}
      value={calligraphyValue}
      onChange={(value) => onCalligraphyChange?.(pickSelectValue(value))}
      clearable
      className={selectClass(!calligraphyValue)}
      aria-label="Каллиграфия"
      clearAriaLabel="Очистить фильтр каллиграфии"
      placeholder="Каллиграфия"
      emptyValue=""
      options={calligraphyOptions as CustomSelectOption[]}
    />
  );

  const variableControl = (
    <CustomSelect
      id={variableFilterId}
      value={variableValue}
      onChange={(value) => onVariableChange?.(pickSelectValue(value))}
      clearable
      className={selectClass(variableValue === 'all')}
      aria-label="Вариативность"
      clearAriaLabel="Очистить фильтр вариативности"
      placeholder="Вариативность"
      emptyValue="all"
      options={variableOptions as CustomSelectOption[]}
    />
  );

  const subsetControl = (
    <CustomSelect
      id={subsetFilterId}
      value={subsetValue}
      onChange={(value) => onSubsetChange?.(pickMultiSelectValue(value))}
      multiple
      clearable
      className={selectClass(Array.isArray(subsetValue) ? subsetValue.length === 0 : !subsetValue)}
      aria-label="Языки"
      clearAriaLabel="Очистить фильтр языков"
      placeholder="Языки"
      searchable
      searchPlaceholder="Поиск языка"
      options={subsetOptions}
    />
  );

  const italicControlNode = (
    <CatalogCheckboxControl
      checked={italicOnly}
      onChange={onItalicOnlyChange}
      label={italicLabel}
      className="w-fit shrink-0 px-2 sm:px-3"
    />
  );

  /** Слот 2-й карточки: ширина колонки сетки, чекбокс по содержимому. */
  const italicControlFit = (
    <div className="flex min-w-0 shrink-0 items-center justify-start" style={cardWidthStyle}>
      {italicControlNode}
    </div>
  );

  const rolePurposeControl = (
    <CustomSelect
      id={roleFilterId}
      value={roleValue}
      onChange={(value) => onRoleChange?.(pickSelectValue(value))}
      clearable
      className={selectClass(!roleValue)}
      aria-label="Назначение"
      clearAriaLabel="Очистить фильтр назначения"
      placeholder="Назначение"
      emptyValue=""
      options={roleOptions as CustomSelectOption[]}
    />
  );

  const rolePurposeControlSlot = (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      {rolePurposeControl}
    </div>
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

  const gridToggleControl = (
    <CatalogGridModeToggle
      value={gridViewMode}
      onChange={onGridViewModeChange}
      layout={useTabletGridToolbar ? 'toggle' : 'segmented'}
      buttonClassName={
        useCompactGridToolbar
          ? 'inline-flex h-9 w-6 items-center justify-center transition-colors'
          : undefined
      }
      groupClassName={useMdGridToolbar ? 'inline-flex items-center gap-3' : undefined}
    />
  );

  const categoryLicenseFilters = (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      <div className="grid grid-cols-2 gap-4">
        {categoryControl}
        {licenseControl}
      </div>
    </div>
  );

  const feelingShapeFilters = (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      <div className="grid grid-cols-2 gap-4">
        {feelingControl}
        {shapeControl}
      </div>
    </div>
  );

  const postSearchFiltersControl = (
    <>
      {categoryLicenseFilters}
      {feelingShapeFilters}
    </>
  );

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

  /** Широкий десктоп: 2-я карточка 3-й строки — размер превью на всю ширину колонки. */
  const wideDesktopFontSizeSlot = (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      <CatalogPreviewFontSizeSlider
        value={previewFontSizePx}
        onChange={onPreviewFontSizePxChange}
        className="w-full min-w-0"
      />
    </div>
  );

  /** 4-я карточка 3-й строки — курсив + сортировка (селект «Популярное» и др.). */
  const wideDesktopItalicSortSlot = (
    <div
      className="flex h-10 min-w-0 shrink-0 items-center gap-2"
      style={cardWidthStyle}
    >
      {italicControlNode}
      <div className="min-h-0 min-w-0 flex-1">{sortSelectControl}</div>
    </div>
  );

  const wideDesktopPreviewControl = (
    <div className="min-w-0 shrink-0" style={twoCardWidthStyle}>
      <CatalogPreviewSampleControls
        layout="text-first"
        presetId={previewPresetFilterId}
        presetValue={previewSamplePreset}
        onPresetChange={onPreviewSamplePresetChange}
        textId={previewCustomTextId}
        textValue={previewCustomText}
        onTextChange={onPreviewCustomTextChange}
        inputInteractiveClassName={fieldInteractive}
        selectClassName={selectClass(false)}
        textContainerClassName="min-w-0 flex-1"
        presetContainerStyle={halfCardControlStyle}
      />
    </div>
  );

  const cardSlot = (node: ReactNode) => (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      {node}
    </div>
  );

  const mdFontSizeSlot = (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      <CatalogPreviewFontSizeSlider
        value={previewFontSizePx}
        onChange={onPreviewFontSizePxChange}
        className="w-full min-w-0"
      />
    </div>
  );

  const mdItalicCardSlot = (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      <CatalogCheckboxControl
        checked={italicOnly}
        onChange={onItalicOnlyChange}
        label={italicLabel}
        className="h-10 w-full justify-start px-2 sm:px-3"
      />
    </div>
  );

  const mdResetGridSlot = (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      <div className="flex h-10 min-w-0 w-full items-center gap-2">
        <div className="min-w-0 shrink-0">{clearFiltersButton}</div>
        <div className="ml-auto shrink-0">{gridToggleControl}</div>
      </div>
    </div>
  );

  /** Поиск + «Искать» в ширину 2 карточек сетки; инпут — всё место до кнопки. */
  const twoCardSearchWithButton = (
    <div className="flex min-w-0 shrink-0 items-center gap-4" style={twoCardWidthStyle}>
      <div className="relative min-w-0 w-full flex-1">{searchControl}</div>
      <div className="flex shrink-0 items-center">{searchButtonControl}</div>
    </div>
  );

  /** Поиск + «Искать» в ширину 1 карточки сетки. */
  const oneCardSearchWithButton = (
    <div className="flex min-w-0 shrink-0 items-center gap-4" style={cardWidthStyle}>
      <div className="relative min-w-0 w-full flex-1">{searchControl}</div>
      <div className="flex shrink-0 items-center">{searchButtonControl}</div>
    </div>
  );

  /** Свой текст + пресет «Имя» в ширину 2 карточек; инпут — всё место до селекта. */
  const twoCardPreviewSampleControl = (
    <div className="min-w-0 shrink-0" style={twoCardWidthStyle}>
      <CatalogPreviewSampleControls
        layout="text-first"
        presetId={previewPresetFilterId}
        presetValue={previewSamplePreset}
        onPresetChange={onPreviewSamplePresetChange}
        textId={previewCustomTextId}
        textValue={previewCustomText}
        onTextChange={onPreviewCustomTextChange}
        inputInteractiveClassName={fieldInteractive}
        selectClassName={selectClass(false)}
        textContainerClassName="relative min-w-0 w-full flex-1"
        presetContainerClassName="shrink-0"
      />
    </div>
  );

  /** Свой текст + пресет «Имя» в ширину 1 карточки. */
  const oneCardPreviewSampleControl = (
    <div className="min-w-0 shrink-0" style={cardWidthStyle}>
      <CatalogPreviewSampleControls
        layout="text-first"
        presetId={previewPresetFilterId}
        presetValue={previewSamplePreset}
        onPresetChange={onPreviewSamplePresetChange}
        textId={previewCustomTextId}
        textValue={previewCustomText}
        onTextChange={onPreviewCustomTextChange}
        inputInteractiveClassName={fieldInteractive}
        selectClassName={selectClass(false)}
        textContainerClassName="relative min-w-0 w-full flex-1"
        presetContainerClassName="shrink-0"
      />
    </div>
  );

  /** <1024px: 7 строк по сетке каталога (2 колонки). */
  const mobileGridToolbar = (
    <div className="flex shrink-0 flex-col gap-4">
      <div className="flex w-full flex-wrap items-center gap-4">
        {leadingToolbar ? (
          <div ref={trailingContainerRef} className="min-w-0 shrink-0" style={cardWidthStyle}>
            {leadingToolbar}
          </div>
        ) : null}
        {oneCardSearchWithButton}
        {cardSlot(categoryControl)}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {oneCardPreviewSampleControl}
        {cardSlot(licenseControl)}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {cardSlot(feelingControl)}
        {cardSlot(shapeControl)}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {cardSlot(variableControl)}
        {cardSlot(subsetControl)}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {cardSlot(calligraphyControl)}
        {rolePurposeControlSlot}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {mdFontSizeSlot}
        {mdItalicCardSlot}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {cardSlot(sortSelectControl)}
        {mdResetGridSlot}
      </div>
    </div>
  );

  /** 1024–1279px: 4 строки по сетке каталога (4 колонки). */
  const tabletGridToolbar = (
    <div className="flex shrink-0 flex-col gap-4">
      <div className="flex w-full flex-wrap items-center gap-4">
        {leadingToolbar ? (
          <div ref={trailingContainerRef} className="min-w-0 shrink-0" style={cardWidthStyle}>
            {leadingToolbar}
          </div>
        ) : null}
        {twoCardSearchWithButton}
        {cardSlot(categoryControl)}
        {cardSlot(licenseControl)}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {twoCardPreviewSampleControl}
        {cardSlot(feelingControl)}
        {cardSlot(shapeControl)}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {cardSlot(variableControl)}
        {cardSlot(subsetControl)}
        {cardSlot(calligraphyControl)}
        {rolePurposeControlSlot}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {mdFontSizeSlot}
        {mdItalicCardSlot}
        {cardSlot(sortSelectControl)}
        {mdResetGridSlot}
      </div>
    </div>
  );

  /** 1280–1440px: 4 строки по сетке карточек каталога. */
  const mdGridToolbar = (
    <div className="flex shrink-0 flex-col gap-4">
      <div className="flex w-full flex-wrap items-center gap-4">
        {leadingToolbar ? (
          <div ref={trailingContainerRef} className="min-w-0 shrink-0" style={cardWidthStyle}>
            {leadingToolbar}
          </div>
        ) : null}
        <div className="relative min-w-0 shrink-0" style={threeCardWidthStyle}>
          {searchControl}
        </div>
        <div className="flex shrink-0 items-center" style={mdSearchButtonStyle ?? cardWidthStyle}>
          {searchButtonControl}
        </div>
        <div className="min-w-0 shrink-0 ml-auto" style={cardWidthStyle}>
          {categoryControl}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        <CatalogPreviewSampleControls
          layout="text-first"
          presetId={previewPresetFilterId}
          presetValue={previewSamplePreset}
          onPresetChange={onPreviewSamplePresetChange}
          textId={previewCustomTextId}
          textValue={previewCustomText}
          onTextChange={onPreviewCustomTextChange}
          inputInteractiveClassName={fieldInteractive}
          selectClassName={selectClass(false)}
          textContainerStyle={threeCardWidthStyle}
          textContainerClassName="min-w-0"
          presetContainerStyle={cardWidthStyle}
          presetContainerClassName="shrink-0"
        />
        <div className="min-w-0 shrink-0 ml-auto" style={cardWidthStyle}>
          {licenseControl}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {cardSlot(shapeControl)}
        {cardSlot(variableControl)}
        {cardSlot(subsetControl)}
        {cardSlot(feelingControl)}
        {cardSlot(calligraphyControl)}
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {mdFontSizeSlot}
        {rolePurposeControlSlot}
        {mdItalicCardSlot}
        {cardSlot(sortSelectControl)}
        {mdResetGridSlot}
      </div>
    </div>
  );

  const wideDesktopTrailingActions = (
    <div className="ml-auto flex shrink-0 items-center gap-4">
      <div className="min-w-0 shrink-0" style={cardWidthStyle}>
        <div className="flex min-w-0 items-center gap-2">
          <div className="shrink-0">{clearFiltersButton}</div>
          <div className="ml-auto shrink-0">{gridToggleControl}</div>
        </div>
      </div>
    </div>
  );

  const wideDesktopToolbar = (
    <div className="flex shrink-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {leadingToolbar ? (
          <div
            ref={trailingContainerRef}
            className="min-w-0 w-full sm:w-auto"
            style={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
          >
            {leadingToolbar}
          </div>
        ) : null}
        {searchWithButtonControl}
        <div className="min-w-0 shrink-0" style={cardWidthStyle}>
          {categoryControl}
        </div>
        <div className="min-w-0 shrink-0" style={cardWidthStyle}>
          {licenseControl}
        </div>
        <div className="min-w-0 shrink-0" style={cardWidthStyle}>
          {shapeControl}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        {wideDesktopPreviewControl}
        <div className="min-w-0 shrink-0" style={cardWidthStyle}>
          {variableControl}
        </div>
        <div className="min-w-0 shrink-0" style={cardWidthStyle}>
          {subsetControl}
        </div>
        <div className="min-w-0 shrink-0" style={cardWidthStyle}>
          {feelingControl}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-4">
        <div className="min-w-0 shrink-0" style={cardWidthStyle}>
          {calligraphyControl}
        </div>
        {wideDesktopFontSizeSlot}
        {rolePurposeControlSlot}
        {wideDesktopItalicSortSlot}
        {wideDesktopTrailingActions}
      </div>
    </div>
  );

  if (isXl || isLg) {
    return wideDesktopToolbar;
  }

  if (isMd) {
    if (useMdGridToolbar) {
      return mdGridToolbar;
    }
    return (
      <div className="flex shrink-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {leadingToolbar ? (
            <div ref={trailingContainerRef} className="min-w-0 flex-1">
              {leadingToolbar}
            </div>
          ) : null}
          {searchWithButtonControl}
          {postSearchFiltersControl}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">{previewSampleControl}</div>
          <div className="min-w-0 shrink-0">{licenseControl}</div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {cardSlot(shapeControl)}
          {cardSlot(variableControl)}
          {cardSlot(subsetControl)}
          {cardSlot(feelingControl)}
          {cardSlot(calligraphyControl)}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {mdFontSizeSlot}
          {rolePurposeControlSlot}
          {mdItalicCardSlot}
          {cardSlot(sortSelectControl)}
          {mdResetGridSlot}
        </div>
      </div>
    );
  }

  if (isSm) {
    if (useTabletGridToolbar) {
      return tabletGridToolbar;
    }
    if (useMobileGridToolbar) {
      return mobileGridToolbar;
    }
    return (
      <div className="flex shrink-0 flex-col gap-4">
        {leadingToolbar ? (
          <div ref={trailingContainerRef} className="min-w-0 w-full">
            {leadingToolbar}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          {searchWithButtonControl}
          {postSearchFiltersControl}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1" style={cardWidthStyle}>{variableControl}</div>
          <div className="min-w-0 flex-1">{subsetControl}</div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {italicControlFit}
          {rolePurposeControlSlot}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0" style={cardWidthStyle}>{sortSelectControl}</div>
          <div className="min-w-0 flex-1">{previewSampleControl}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">{splitAfterActions}</div>
        </div>
      </div>
    );
  }

  if (useMobileGridToolbar) {
    return mobileGridToolbar;
  }

  return (
    <CatalogTopToolbar
      trailingToolbar={leadingToolbar}
      trailingContainerRef={trailingContainerRef}
      trailingContainerClassName="min-w-0 w-full sm:w-auto"
      trailingContainerStyle={toolbarAlignToGrid ? { width: oneCardWidthPx, maxWidth: '100%' } : undefined}
      searchContainerClassName="contents"
      searchActionContainerClassName="contents"
      postSearchFiltersControl={
        useGridSearchWidth ? (
          <>
            {searchWithButtonControl}
            {postSearchFiltersControl}
          </>
        ) : (
          postSearchFiltersControl
        )
      }
      postSearchFiltersContainerClassName="flex min-w-0 flex-wrap items-center gap-4"
      searchControl={useGridSearchWidth ? null : searchControl}
      searchActionControl={useGridSearchWidth ? null : searchButtonControl}
      primaryFiltersControl={variableControl}
      secondaryFiltersControl={subsetControl}
      italicControl={italicControlNode}
      actionsControl={sortButtonsControl}
      afterActionsControl={afterActions}
    />
  );
}
