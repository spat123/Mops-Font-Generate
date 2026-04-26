import React from 'react';
import { EditAssetIcon } from './EditAssetIcon';
import { enterIconUrl } from './editIconUrls';

export function CatalogSearchButton({ disabled = false, onClick, iconOnly = false }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-accent bg-accent text-sm uppercase font-semibold text-white disabled:cursor-default disabled:bg-gray-50 disabled:border-gray-50 disabled:text-gray-400 ${
        iconOnly ? 'w-10 px-0' : 'w-full gap-1.5 px-3'
      }`}
      aria-label="Искать"
    >
      {!iconOnly ? <span>Искать</span> : null}
      <EditAssetIcon src={enterIconUrl} className="h-4 w-4" />
    </button>
  );
}
