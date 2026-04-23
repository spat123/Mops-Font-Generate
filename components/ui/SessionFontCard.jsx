import React, { useState } from 'react';
import { CardActionsMenu } from './CardActionsMenu';
import { CatalogDownloadSplitButton } from './CatalogDownloadSplitButton';

const PREVIEW_SAMPLE = 'AaBbCcDdEe';

function CardRemoveButton({ onClick }) {
  return (
    <button
      type="button"
      className="absolute right-2 top-2 text-gray-400 transition-colors hover:text-red-500"
      onClick={onClick}
      aria-label="Удалить из сессии"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

/** Карточка шрифта в сессии. variant=tall — сетка Google (высота и крупнее превью). */
export function SessionFontCard({
  selected,
  title,
  subtitle,
  previewStyle,
  onCardClick,
  onRemove,
  /** Меню «⋯» (например в сохранённой библиотеке); если задано, крестик не показывается */
  menuItems,
  /** Нижний правый угол: CatalogDownloadSplitButton (как в каталоге) */
  downloadSplitButtonProps,
  variant = 'default',
  previewClassName,
  shellClassName = '',
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const base =
    `group relative rounded-lg bg-surface-card transition-all duration-200 ${
      onCardClick ? 'cursor-pointer ' : ''
    }` +
    (selected
      ? 'bg-accent-soft'
      : 'hover:bg-gray-50');

  const shell =
    variant === 'tall'
      ? `${base} flex min-h-[132px] flex-col p-4`
      : `${base} flex h-full flex-col p-4`;

  const previewCls =
    previewClassName ||
    (variant === 'tall'
      ? 'mt-2 min-h-[1.75rem] truncate text-xl leading-tight'
      : 'mt-2 truncate');

  const subCls = 'mt-auto pt-1 text-xs text-gray-500';

  return (
    <div
      className={`${shell} ${shellClassName}`.trim()}
      onClick={onCardClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="truncate text-sm font-medium">{title}</div>
      <div className={previewCls} style={previewStyle}>
        {PREVIEW_SAMPLE}
      </div>
      <div className={subCls}>{subtitle}</div>
      {Array.isArray(menuItems) && menuItems.length > 0 ? (
        <div
          className="absolute right-2 top-2 z-20"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CardActionsMenu triggerLabel={`Действия: ${title}`} items={menuItems} />
        </div>
      ) : onRemove ? (
        <CardRemoveButton
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      ) : null}
      {downloadSplitButtonProps ? (
        <div
          className={[
            'absolute bottom-2 right-2 z-[11] max-w-[calc(100%-0.75rem)] opacity-0 transition-opacity duration-200',
            'pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100',
            'focus-within:pointer-events-auto focus-within:opacity-100',
            downloadMenuOpen ? '!pointer-events-auto !opacity-100' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CatalogDownloadSplitButton
            {...downloadSplitButtonProps}
            onMenuOpenChange={setDownloadMenuOpen}
          />
        </div>
      ) : null}
    </div>
  );
}
