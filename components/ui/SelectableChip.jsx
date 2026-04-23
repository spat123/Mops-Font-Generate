import React from 'react';

/** Кнопка-«чип» с заливкой при выборе (наборы глифов в сайдбаре). */
export function SelectableChip({ active, onClick, children, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      onClick={onClick}
      {...props}
      className={`rounded-md px-3 py-1.5 text-xs transition-all duration-150 ${
        active
          ? 'bg-accent text-white'
          : 'border border-gray-200 bg-white text-gray-800 hover:bg-black/[0.9] hover:border-black/[0.9] hover:text-white'
      } ${className}`.trim()}
    >
      {children}
    </button>
  );
}
