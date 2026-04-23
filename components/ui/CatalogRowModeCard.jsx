import React from 'react';
import { CatalogFontCard } from './CatalogFontCard';
import { CatalogRowHeader } from './CatalogRowHeader';

export function CatalogRowModeCard({
  family,
  metaItems = [],
  previewFamily,
  previewText,
  previewProps = undefined,
  selected = false,
  busy = false,
  actions = null,
  selectionOverlay = null,
  hoverOverlay = null,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  draggable = false,
  onDragStart,
  onDragEnd,
}) {
  const resolvedPreviewProps = previewProps && typeof previewProps === 'object' ? previewProps : {};
  const { className: previewClassName = '', ...restPreviewProps } = resolvedPreviewProps;

  return (
    <CatalogFontCard
      className="rounded-none border-b border-gray-300 bg-white hover:bg-gray-50/55"
      minHeightClass="h-[176px] min-h-[176px] min-w-0"
      selected={selected}
      busy={busy}
      actions={actions}
      selectionOverlay={selectionOverlay}
      hoverOverlay={hoverOverlay}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title={<CatalogRowHeader family={family} metaItems={metaItems} />}
      titleClassName="w-full"
      preview={
        <div
          {...restPreviewProps}
          className={`mt-1 flex min-h-0 min-w-0 flex-1 items-end overflow-visible whitespace-nowrap pb-1 text-[clamp(3.5rem,6vw,5rem)] leading-[0.95] text-gray-800 ${previewClassName}`.trim()}
          style={{ fontFamily: previewFamily }}
        >
          {previewText}
        </div>
      }
    />
  );
}
