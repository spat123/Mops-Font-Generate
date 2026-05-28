import { useCallback, useMemo, type CSSProperties } from 'react';
import { CustomSelect } from '../ui/CustomSelect';
import { SearchClearButton } from '../ui/SearchClearButton';
import {
  CATALOG_PREVIEW_PRESET_CUSTOM,
  CATALOG_PREVIEW_PRESET_NAME,
  CATALOG_PREVIEW_PRESET_SELECT_OPTIONS,
} from '../../utils/catalogPreviewSample';

export type CatalogPreviewSampleLayout = 'preset-first' | 'text-first';

export type CatalogPreviewSampleControlsProps = {
  presetId?: string;
  presetValue?: string;
  onPresetChange?: (value: string) => void;
  textId?: string;
  textValue?: string;
  onTextChange?: (value: string) => void;
  inputInteractiveClassName?: string;
  selectClassName?: string;
  disabled?: boolean;
  layout?: CatalogPreviewSampleLayout;
  textContainerStyle?: CSSProperties;
  presetContainerStyle?: CSSProperties;
  textContainerClassName?: string;
  presetContainerClassName?: string;
};

export function CatalogPreviewSampleControls({
  presetId,
  presetValue,
  onPresetChange,
  textId,
  textValue,
  onTextChange,
  inputInteractiveClassName = '',
  selectClassName = '',
  disabled = false,
  layout = 'preset-first',
  textContainerStyle,
  presetContainerStyle,
  textContainerClassName = '',
  presetContainerClassName = '',
}: CatalogPreviewSampleControlsProps) {
  const textFirst = layout === 'text-first';
  const hasCustomOverride = Boolean(String(textValue ?? '').trim());

  const selectValue = useMemo(() => {
    const v = String(presetValue || CATALOG_PREVIEW_PRESET_NAME);
    if (v === CATALOG_PREVIEW_PRESET_CUSTOM) return CATALOG_PREVIEW_PRESET_NAME;
    return v;
  }, [presetValue]);

  const resolvedSelectClassName = [
    selectClassName,
    hasCustomOverride ? '!text-gray-900/45 hover:!text-gray-900' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handlePresetChange = useCallback(
    (value: string) => {
      onTextChange?.('');
      onPresetChange?.(value);
    },
    [onPresetChange, onTextChange],
  );

  const presetNode = (
    <div className={`min-w-0 shrink-0 ${presetContainerClassName}`.trim()} style={presetContainerStyle}>
      <CustomSelect
        id={presetId}
        value={selectValue}
        onChange={handlePresetChange}
        className={resolvedSelectClassName}
        aria-label="Образец текста в карточках"
        options={[...CATALOG_PREVIEW_PRESET_SELECT_OPTIONS]}
        disabled={disabled}
      />
    </div>
  );

  const textNode = (
    <div
      className={`relative min-w-0 flex-1 ${textContainerClassName}`.trim()}
      style={textContainerStyle}
    >
      <input
        id={textId}
        type="text"
        value={textValue}
        onChange={(event) => onTextChange?.(event.target.value)}
        disabled={disabled}
        placeholder="Свой текст"
        className={`box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-9 text-sm leading-normal font-semibold uppercase text-gray-900 placeholder:text-gray-900/40 hover:placeholder:text-gray-900 ${inputInteractiveClassName} focus:border-black/[0.14] focus:outline-none sm:pl-3`}
        autoComplete="off"
        spellCheck={false}
      />
      {hasCustomOverride ? (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <SearchClearButton onClick={() => onTextChange?.('')} />
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-w-0 items-center gap-4">
      {textFirst ? (
        <>
          {textNode}
          {presetNode}
        </>
      ) : (
        <>
          {presetNode}
          {textNode}
        </>
      )}
    </div>
  );
}
