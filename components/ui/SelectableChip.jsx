import React from 'react';

/** Кнопка-«чип» с заливкой при выборе (наборы глифов в сайдбаре). */
export function SelectableChip({ active, onClick, children, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs transition-all duration-150 ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'border border-gray-200 bg-white text-accent hover:bg-accent-soft'
      } ${className}`.trim()}
    >
      {children}
    </button>
  );
}
