import type { MouseEventHandler } from 'react';
import { EditAssetIcon } from '../ui/EditAssetIcon';
import { enterIconUrl } from '../ui/editIconUrls';

export type CatalogSearchButtonProps = {
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  iconOnly?: boolean;
};

export function CatalogSearchButton({ disabled = false, onClick, iconOnly = false }: CatalogSearchButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent bg-accent text-sm uppercase font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-gray-50 disabled:border-gray-50 disabled:text-gray-400 ${
        iconOnly ? 'w-10 px-0' : 'w-full gap-1.5 px-3'
      }`}
      aria-label="Искать"
    >
      {!iconOnly ? <span>Искать</span> : null}
      <EditAssetIcon src={enterIconUrl} className="h-4 w-4" />
    </button>
  );
}
