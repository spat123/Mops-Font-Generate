import React from 'react';

export function CatalogTextSortControls({
  sortValue,
  onSortChange,
  sortOptions = [],
  showResetButton = true,
  resetDisabled = true,
  onReset,
  className = 'contents',
  itemClassName = 'box-border h-10 shrink-0 whitespace-nowrap bg-transparent px-1 text-sm uppercase font-semibold transition-colors',
  itemActiveClassName = 'text-accent',
  itemInactiveClassName = 'text-gray-800 hover:text-accent',
  resetLabel = 'Сбросить все',
  resetButtonClassName = 'box-border h-10 shrink-0 whitespace-nowrap px-2 text-sm uppercase font-semibold text-accent disabled:cursor-default disabled:opacity-40 disabled:text-gray-900',
}) {
  return (
    <div className={className}>
      {sortOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSortChange?.(opt.value)}
          className={`${itemClassName} ${sortValue === opt.value ? itemActiveClassName : itemInactiveClassName}`}
        >
          {opt.label}
        </button>
      ))}
      {showResetButton ? (
        <button type="button" disabled={resetDisabled} onClick={onReset} className={resetButtonClassName}>
          {resetLabel}
        </button>
      ) : null}
    </div>
  );
}
