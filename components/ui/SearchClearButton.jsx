import React from 'react';

export function SearchClearButton({ onClick, className = '', ariaLabel = 'Очистить поиск' }) {
  const buttonClassName = [
    'inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors',
    ' hover:text-accent focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      className={buttonClassName}
      aria-label={ariaLabel}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
