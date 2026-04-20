import React from 'react';

/**
 * Вкладка с нижней границей (как «Просмотр» / «Все шрифты»).
 * @param {boolean} [nested=false] — для строки внутри уже обведённого `border-b` (добавляет `-mb-px` у активной).
 */
export function UnderlineTab({
  isActive,
  onClick,
  children,
  nested = false,
  className = '',
  type = 'button',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 uppercase font-semibold text-sm transition-colors duration-200 ${
        isActive
          ? `text-accent border-b-2 border-accent${nested ? ' -mb-px' : ''}`
          : 'text-gray-500 hover:text-accent'
      } ${className}`.trim()}
    >
      {children}
    </button>
  );
}
