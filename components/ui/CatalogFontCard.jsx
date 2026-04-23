import React from 'react';

export function CatalogFontCard({
  busy = false,
  actions = null,
  title,
  preview,
  footer = null,
  minHeightClass = '',
  className = '',
  selected = false,
  selectionOverlay = null,
  hoverOverlay = null,
  titleClassName = 'truncate text-sm font-medium text-gray-800',
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
}) {
  const rootClassName = [
    'group relative flex flex-col rounded-lg bg-surface-card p-4 select-none transition-colors duration-100 hover:bg-gray-50',
    minHeightClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const actionsClassName =
    'absolute right-2 top-2 z-30 max-w-[min(100%,12rem)] transition-opacity duration-100 ' +
    (busy
      ? 'pointer-events-auto opacity-100'
      : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100');

  return (
    <div
      className={rootClassName}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
    >
      <div className={actionsClassName}>{actions}</div>
      {hoverOverlay && !selected ? (
        <div className="pointer-events-none absolute -inset-1 z-20 opacity-0 transition-opacity duration-100 group-hover:opacity-100 focus-within:opacity-100">
          {hoverOverlay}
        </div>
      ) : null}
      {selected ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-red-500" />
          <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-red-500/12" />
          {selectionOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-20">{selectionOverlay}</div>
          ) : null}
        </>
      ) : null}
      <div className={titleClassName}>{title}</div>
      {preview}
      {footer}
    </div>
  );
}
