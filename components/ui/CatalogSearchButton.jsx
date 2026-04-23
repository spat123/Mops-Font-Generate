import React from 'react';

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
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M15.5 4.5v6a3 3 0 0 1-3 3H5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M8.5 10.5 5.5 13.5 8.5 16.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
