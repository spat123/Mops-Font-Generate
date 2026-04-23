import React from 'react';

export function CatalogFontCard({
  busy = false,
  actions = null,
  title,
  preview,
  footer = null,
  minHeightClass = '',
  className = '',
}) {
  const rootClassName = [
    'group relative flex flex-col rounded-lg bg-surface-card p-4 pt-3 pr-3 transition-all duration-200 hover:bg-gray-50',
    minHeightClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const actionsClassName =
    'absolute right-2 top-2 z-10 max-w-[min(100%,12rem)] transition-opacity duration-200 ' +
    (busy
      ? 'pointer-events-auto opacity-100'
      : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100');

  return (
    <div className={rootClassName}>
      <div className={actionsClassName}>{actions}</div>
      <div className="truncate text-sm font-medium text-gray-800">{title}</div>
      {preview}
      {footer}
    </div>
  );
}
