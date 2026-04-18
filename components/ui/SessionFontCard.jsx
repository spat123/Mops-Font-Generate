import React from 'react';

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
  variant = 'default',
  previewClassName,
}) {
  const base =
    'relative cursor-pointer rounded-lg bg-surface-card transition-all duration-200 ' +
    (selected
      ? 'bg-accent-soft'
      : 'hover:bg-gray-50');

  const shell =
    variant === 'tall'
      ? `${base} flex min-h-[132px] flex-col p-4`
      : `${base} p-4`;

  const previewCls =
    previewClassName ||
    (variant === 'tall'
      ? 'mt-2 min-h-[1.75rem] truncate text-xl leading-tight'
      : 'mt-2 truncate');

  const subCls =
    variant === 'tall' ? 'mt-auto pt-1 text-xs text-gray-500' : 'mt-1 text-xs text-gray-500';

  return (
    <div className={shell} onClick={onCardClick}>
      <div className="truncate text-sm font-medium">{title}</div>
      <div className={previewCls} style={previewStyle}>
        {PREVIEW_SAMPLE}
      </div>
      <div className={subCls}>{subtitle}</div>
      {onRemove ? (
        <CardRemoveButton
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      ) : null}
    </div>
  );
}
