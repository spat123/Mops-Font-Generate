import { useCallback, type SVGProps } from 'react';
import DraggableValueRangeSlider from '../ui/DraggableValueRangeSlider';
import { Tooltip } from '../ui/Tooltip';
import {
  CATALOG_PREVIEW_FONT_SIZE_MIN_PX,
  CATALOG_PREVIEW_FONT_SIZE_MAX_PX,
  CATALOG_PREVIEW_FONT_SIZE_STEP_PX,
  clampCatalogPreviewFontSizePx,
} from '../../utils/catalogPreviewSample';

function SliderIconFontSize(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M8 21C8 21.5523 7.55228 22 7 22C6.44772 22 6 21.5523 6 21V4H1C0.447715 4 0 3.55228 0 3C0 2.44772 0.447715 2 1 2H13C13.5523 2 14 2.44772 14 3C14 3.55228 13.5523 4 13 4H8V21Z"
        fill="currentColor"
      />
      <path
        d="M23 8C23.5523 8 24 8.44772 24 9C24 9.55228 23.5523 10 23 10H19V21C19 21.5523 18.5523 22 18 22C17.4477 22 17 21.5523 17 21V10H13C12.4477 10 12 9.55228 12 9C12 8.44772 12.4477 8 13 8H23Z"
        fill="currentColor"
      />
    </svg>
  );
}

export type CatalogPreviewFontSizeSliderProps = {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function CatalogPreviewFontSizeSlider({
  value,
  onChange,
  disabled = false,
  className = '',
}: CatalogPreviewFontSizeSliderProps) {
  const clamped = clampCatalogPreviewFontSizePx(value);

  const handleChange = useCallback(
    (next: number) => {
      onChange?.(clampCatalogPreviewFontSizePx(next));
    },
    [onChange],
  );

  return (
    <div
      className={`flex h-10 items-center gap-2 ${className}`.trim()}
      role="group"
      aria-label="Размер текста в карточках"
    >
      <Tooltip content="Размер текста">
        <span className="flex h-8 w-5 shrink-0 items-center justify-center text-gray-800">
          <SliderIconFontSize />
        </span>
      </Tooltip>
      <div className="min-w-0 flex-1">
        <DraggableValueRangeSlider
          min={CATALOG_PREVIEW_FONT_SIZE_MIN_PX}
          max={CATALOG_PREVIEW_FONT_SIZE_MAX_PX}
          step={CATALOG_PREVIEW_FONT_SIZE_STEP_PX}
          value={clamped}
          onChange={handleChange}
          formatDisplay={(v) => String(Math.round(v))}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
