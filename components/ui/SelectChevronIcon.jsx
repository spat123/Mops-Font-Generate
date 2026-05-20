import React from 'react';

/** Стрелка выпадающего списка (как в CustomSelect / FontLibraryStatusMenu). */
export function SelectChevronIcon({ className = 'h-4 w-4 shrink-0', open = false }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={[className, open ? 'rotate-180' : '', 'transition-transform'].filter(Boolean).join(' ')}
      aria-hidden
    >
      <path d="M5 7h10l-5 6-5-6z" />
    </svg>
  );
}
