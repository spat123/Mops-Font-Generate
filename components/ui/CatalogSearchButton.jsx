import React from 'react';
import { EditAssetIcon } from './EditAssetIcon';
import { enterIconUrl } from './editIconUrls';

export function CatalogSearchButton({ disabled = false, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full border border-accent bg-accent px-3 text-sm uppercase font-semibold text-white disabled:cursor-default disabled:bg-gray-50 disabled:border-gray-50 disabled:text-gray-400"
      aria-label="Искать"
    >
      <span>Искать</span>
      <EditAssetIcon src={enterIconUrl} className="h-4 w-4" />
    </button>
  );
}
