import type { DragEventHandler, MouseEventHandler, ReactNode } from 'react';

export type UnderlineTabProps = {
  isActive: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children?: ReactNode;
  /** Для строки внутри уже обведённого `border-b` (добавляет `-mb-px` у активной). */
  nested?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onDragOver?: DragEventHandler<HTMLButtonElement>;
  onDrop?: DragEventHandler<HTMLButtonElement>;
  onDragEnter?: DragEventHandler<HTMLButtonElement>;
  onDragLeave?: DragEventHandler<HTMLButtonElement>;
};

/**
 * Вкладка с нижней границей (как «Просмотр» / «Все шрифты»).
 */
export function UnderlineTab({
  isActive,
  onClick,
  children,
  nested = false,
  className = '',
  type = 'button',
  onDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
}: UnderlineTabProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      className={`px-4 py-2 uppercase font-semibold text-xs transition-colors duration-200 ${
        isActive
          ? `text-accent border-b-2 border-accent${nested ? ' -mb-px' : ''}`
          : 'text-gray-800 hover:text-accent'
      } ${className}`.trim()}
    >
      {children}
    </button>
  );
}
