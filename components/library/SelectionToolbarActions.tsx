import { useEffect, useState, type ReactNode } from 'react';
import { Tooltip } from '../ui/Tooltip';
import { CatalogDownloadSplitButton } from '../catalog/CatalogDownloadSplitButton';

export type SelectionToolbarActionsProps = {
  selectedCount?: number;
  downloadSelected?: (() => void) | null;
  downloadSelectedAsFormat?: ((format: string) => void) | null;
  emptyTooltip?: string;
  moveControl?: ReactNode;
};

export function SelectionToolbarActions({
  selectedCount = 0,
  downloadSelected = null,
  downloadSelectedAsFormat = null,
  emptyTooltip = 'Выделите карточки, чтобы скачать',
  moveControl = null,
}: SelectionToolbarActionsProps) {
  const canDownloadSelected = selectedCount > 0 && typeof downloadSelected === 'function';
  const canDownloadSelectedAsFormat =
    selectedCount > 0 && typeof downloadSelectedAsFormat === 'function';
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const hideToolbarLabel = viewportW < 1024;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setViewportW(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {moveControl}
      <Tooltip
        as="span"
        content={canDownloadSelected ? `Скачать выделенные (${selectedCount})` : emptyTooltip}
        className="inline-flex"
      >
        <CatalogDownloadSplitButton
          className={`mr-3 ${hideToolbarLabel ? 'w-[5.5rem]' : 'w-auto'}`}
          layout="comfortable"
          heightClass="h-8"
          tone="accent"
          disabled={!canDownloadSelected}
          primaryLabel="Скачать"
          primaryCount={selectedCount}
          hidePrimaryLabel={hideToolbarLabel}
          primaryAriaLabel={
            selectedCount > 0
              ? `Скачать выделенные шрифты (${selectedCount})`
              : 'Скачать выделенные шрифты'
          }
          onPrimaryClick={() => downloadSelected?.()}
          menuItems={[
            {
              key: 'zip',
              label: 'ZIP (по умолчанию)',
              onSelect: () => downloadSelected?.(),
            },
            {
              key: 'ttf',
              label: 'TTF',
              disabled: !canDownloadSelectedAsFormat,
              onSelect: () => downloadSelectedAsFormat?.('ttf'),
            },
            {
              key: 'otf',
              label: 'OTF',
              disabled: !canDownloadSelectedAsFormat,
              onSelect: () => downloadSelectedAsFormat?.('otf'),
            },
            {
              key: 'woff',
              label: 'WOFF',
              disabled: !canDownloadSelectedAsFormat,
              onSelect: () => downloadSelectedAsFormat?.('woff'),
            },
            {
              key: 'woff2',
              label: 'WOFF2',
              disabled: !canDownloadSelectedAsFormat,
              onSelect: () => downloadSelectedAsFormat?.('woff2'),
            },
          ]}
        />
      </Tooltip>
    </>
  );
}
