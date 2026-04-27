import React from 'react';

export function PopupDialogHeader({
  title,
  onClose,
  className = '',
  titleClassName = '',
  closeAriaLabel = 'Закрыть',
}) {
  return (
    <div className={`flex items-center justify-between border-b border-gray-200 ${className}`}>
      <h3
        className={`flex h-12 items-center px-6 text-lg font-semibold uppercase text-gray-900 ${titleClassName}`}
      >
        {title}
      </h3>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-12 w-12 items-center justify-center border-l border-gray-200 text-gray-800 transition-colors hover:bg-transparent hover:text-accent"
        aria-label={closeAriaLabel}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
