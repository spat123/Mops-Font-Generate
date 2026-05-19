import React from 'react';
import { HexProgressLoader } from './HexProgressLoader';

function CheckIcon({ className = 'h-7 w-7' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon({ className = 'h-7 w-7' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function SquareToast({ kind = 'success', ariaLabel }) {
  const label =
    ariaLabel ||
    (kind === 'loading' ? 'Загрузка' : kind === 'error' ? 'Ошибка' : 'Готово');

  return (
    <div className="app-toast-square__inner" role="status" aria-label={label}>
      {kind === 'loading' ? (
        <HexProgressLoader size={54} className="app-toast-square__loader" />
      ) : kind === 'error' ? (
        <XIcon />
      ) : (
        <CheckIcon />
      )}
    </div>
  );
}

