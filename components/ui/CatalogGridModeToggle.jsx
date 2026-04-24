import React from 'react';
import { EditAssetIcon } from './EditAssetIcon';
import { gridIconUrl, rowIconUrl } from './editIconUrls';

export function CatalogGridModeToggle({ value = 'grid', onChange }) {
  const buttonBaseClass =
    'inline-flex h-9 w-9 items-center justify-center  transition-colors';

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label="Режим сетки"
        onClick={() => onChange?.('grid')}
        className={`${buttonBaseClass} ${
          value === 'grid'
            ? 'text-accent'
            : 'text-gray-800 hover:text-accent'
        }`}
      >
        <EditAssetIcon src={gridIconUrl} className="h-6 w-6" />
      </button>
      <button
        type="button"
        aria-label="Режим в строку"
        onClick={() => onChange?.('row')}
        className={`${buttonBaseClass} ${
          value === 'row'
            ? 'text-accent'
            : 'text-gray-800 hover:text-accent'
        }`}
      >
        <EditAssetIcon src={rowIconUrl} className="h-6 w-6" />
      </button>
    </div>
  );
}
