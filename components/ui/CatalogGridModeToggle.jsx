import React from 'react';
import { EditAssetIcon } from './EditAssetIcon';
import { gridIconUrl, rowIconUrl } from './editIconUrls';
import { Tooltip } from './Tooltip';

const GRID_MODE_TOOLTIP = 'Сетка';
const ROW_MODE_TOOLTIP = 'Строка';

export function CatalogGridModeToggle({ value = 'grid', onChange }) {
  const buttonBaseClass =
    'h-9 w-9 items-center justify-center transition-colors';

  return (
    <div className="inline-flex items-center gap-2">
      <Tooltip
        content={GRID_MODE_TOOLTIP}
        as="button"
        type="button"
        aria-label="Режим сетки"
        className={`${buttonBaseClass} ${
          value === 'grid' ? 'text-accent' : 'text-gray-800 hover:text-accent'
        }`}
        onClick={() => onChange?.('grid')}
      >
        <EditAssetIcon src={gridIconUrl} className="h-6 w-6" />
      </Tooltip>
      <Tooltip
        content={ROW_MODE_TOOLTIP}
        as="button"
        type="button"
        aria-label="Режим в строку"
        className={`${buttonBaseClass} ${
          value === 'row' ? 'text-accent' : 'text-gray-800 hover:text-accent'
        }`}
        onClick={() => onChange?.('row')}
      >
        <EditAssetIcon src={rowIconUrl} className="h-6 w-6" />
      </Tooltip>
    </div>
  );
}
