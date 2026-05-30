import { EditAssetIcon } from '../ui/EditAssetIcon';
import { gridIconUrl, rowIconUrl } from '../ui/editIconUrls';
import { Tooltip } from '../ui/Tooltip';

const GRID_MODE_TOOLTIP = 'Сетка';
const ROW_MODE_TOOLTIP = 'Строка';

export type CatalogViewMode = 'grid' | 'row';

export type CatalogGridModeToggleLayout = 'segmented' | 'toggle';

export type CatalogGridModeToggleProps = {
  value?: CatalogViewMode;
  onChange?: (mode: CatalogViewMode) => void;
  /** `segmented` — две кнопки; `toggle` — одна кнопка, клик меняет режим. */
  layout?: CatalogGridModeToggleLayout;
  /** Классы кнопки режима (по умолчанию `h-9 w-9`). */
  buttonClassName?: string;
  /** Классы обёртки переключателя (по умолчанию `gap-2`). */
  groupClassName?: string;
};

export function CatalogGridModeToggle({
  value = 'grid',
  onChange,
  layout = 'segmented',
  buttonClassName = 'inline-flex h-9 w-9 cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed',
  groupClassName = 'inline-flex items-center gap-2',
}: CatalogGridModeToggleProps) {
  const buttonBaseClass = buttonClassName;

  if (layout === 'toggle') {
    const isGrid = value === 'grid';
    const nextMode: CatalogViewMode = isGrid ? 'row' : 'grid';
    const tooltip = isGrid ? ROW_MODE_TOOLTIP : GRID_MODE_TOOLTIP;
    const iconUrl = isGrid ? gridIconUrl : rowIconUrl;

    return (
      <Tooltip
        content={tooltip}
        as="button"
        type="button"
        aria-label={isGrid ? 'Переключить на режим строки' : 'Переключить на режим сетки'}
        aria-pressed={value === 'row'}
        className={`${buttonBaseClass} text-accent`}
        onClick={() => onChange?.(nextMode)}
      >
        <EditAssetIcon src={iconUrl} className="h-6 w-6" />
      </Tooltip>
    );
  }

  return (
    <div className={groupClassName}>
      <Tooltip
        content={GRID_MODE_TOOLTIP}
        as="button"
        type="button"
        aria-label="Режим сетки"
        className={`${buttonBaseClass} ${value === 'grid' ? 'text-accent' : 'text-gray-800 hover:text-accent'}`}
        onClick={() => onChange?.('grid')}
      >
        <EditAssetIcon src={gridIconUrl} className="h-6 w-6" />
      </Tooltip>
      <Tooltip
        content={ROW_MODE_TOOLTIP}
        as="button"
        type="button"
        aria-label="Режим в строку"
        className={`${buttonBaseClass} ${value === 'row' ? 'text-accent' : 'text-gray-800 hover:text-accent'}`}
        onClick={() => onChange?.('row')}
      >
        <EditAssetIcon src={rowIconUrl} className="h-6 w-6" />
      </Tooltip>
    </div>
  );
}
