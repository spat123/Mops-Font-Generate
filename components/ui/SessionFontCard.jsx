import React, { useState } from 'react';
import { CardActionsMenu } from './CardActionsMenu';
import { CatalogDownloadSplitButton } from './CatalogDownloadSplitButton';
import { Tooltip } from './Tooltip';

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

function SelectionOverlay() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20 rounded-lg border-2 border-accent" />
      <div className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-accent/12" />
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
            <path
              d="M4.5 10.5L8.25 14.25L15.5 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </>
  );
}

/** Карточка шрифта в сессии. variant=tall — сетка Google (высота и крупнее превью). */
export function SessionFontCard({
  selected,
  batchSelected = false,
  title,
  recentlyAdded = false,
  subtitle,
  subtitleParts,
  subtitleClassName,
  previewStyle,
  onCardClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onRemove,
  /** Кастомное действие в правом верхнем углу (например «+ добавить») */
  cornerAction,
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
    `group relative rounded-lg bg-surface-card transition-all min-h-32 duration-200 ${
      onCardClick ? 'cursor-pointer ' : ''
    }` +
    (batchSelected ? '' : selected ? 'bg-accent-soft' : 'hover:bg-gray-50');

  const shell =
    variant === 'tall'
      ? `${base} flex min-h-[132px] flex-col p-4`
      : `${base} flex h-full flex-col p-4`;

  const previewCls =
    previewClassName ||
    (variant === 'tall'
      ? 'mt-2 min-h-[1.75rem] truncate text-xl leading-tight'
      : 'mt-2 truncate');

  const subCls = subtitleClassName || 'mt-auto pt-1 text-xs text-gray-500';

  return (
    <div
      className={`${shell} ${shellClassName}`.trim()}
      onClick={onCardClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="truncate text-sm font-medium">{title}</div>
        {recentlyAdded ? (
          <Tooltip content="Добавленный за последние сутки" openDelayMs={150}>
            <span
              className="inline-flex h-2 w-2 shrink-0 rounded-full bg-accent"
              aria-label="Добавленный за последние сутки"
            />
          </Tooltip>
        ) : null}
      </div>
      <div className={previewCls} style={previewStyle}>
        {PREVIEW_SAMPLE}
      </div>
      {Array.isArray(subtitleParts) && subtitleParts.length > 0 ? (
        <div className={`${subCls} flex flex-wrap items-center gap-2`}>
          {subtitleParts.map((part, index) => (
            <span key={`${String(part)}-${index}`}>{part}</span>
          ))}
        </div>
      ) : (
        <div className={subCls}>{subtitle}</div>
      )}
      {batchSelected ? <SelectionOverlay /> : null}
      {!batchSelected && cornerAction ? (
        <div className="absolute right-2 top-2 z-[12]">{cornerAction}</div>
      ) : !batchSelected && Array.isArray(menuItems) && menuItems.length > 0 ? (
        <CardActionsMenu triggerLabel={`Действия: ${title}`} items={menuItems} />
      ) : !batchSelected && onRemove ? (
        <CardRemoveButton
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      ) : null}
      {!batchSelected && downloadSplitButtonProps ? (
        <div
          className={[
            'absolute bottom-2 right-2 z-[11] max-w-[calc(100%-1rem)] opacity-0 transition-opacity duration-200',
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
