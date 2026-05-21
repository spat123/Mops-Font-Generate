import React from 'react';

export function PopupDialogHeader({
  title,
  onClose,
  className = '',
  titleClassName = '',
  closeAriaLabel = 'Закрыть',
  /**
   * Подсказка слева от разделителя перед кнопкой закрытия (например «ESC»).
   * По умолчанию «ESC»; передайте `null`, чтобы скрыть.
   */
  closeShortcutHint = 'ESC',
}) {
  return (
    <div className={`flex min-h-12 items-stretch justify-between border-b border-gray-200 ${className}`}>
      <h3
        className={`flex min-w-0 flex-1 items-center px-6 text-lg font-semibold uppercase text-gray-900 ${titleClassName}`}
      >
        {title}
      </h3>
      <div className="flex h-12 shrink-0 items-center">
        {closeShortcutHint ? (
          <span
            className="mr-2 inline-flex h-5 items-center justify-center rounded-md border border-gray-200 px-1 text-[11px] font-semibold uppercase leading-none text-gray-900 select-none sm:mr-3 sm:px-2"
            aria-hidden
          >
            {closeShortcutHint}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center self-stretch border-l border-gray-200 text-gray-800 transition-colors hover:bg-transparent hover:text-accent"
          aria-label={closeAriaLabel}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
