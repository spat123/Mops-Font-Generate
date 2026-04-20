import React from 'react';

/** Круговой индикатор загрузки того же визуального размера, что и иконка «+» на карточке каталога (h-5 w-5). */
export default function CatalogSessionAddSpinner({ className = '' }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 animate-spin text-accent ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2} />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="14 43"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}
