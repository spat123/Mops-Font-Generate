import React, { useCallback } from 'react';
import { DEFAULT_PREVIEW_TEXT, useSettings } from '../../contexts/SettingsContext';
import { toast } from '../../utils/appNotify';

/** Подсказка + сброс текста: нижняя полоса превью (слева подсказка, справа сброс текста). */
export function PreviewEditTextHint({ className = '' } = {}) {
  const { text, setText } = useSettings();
  const isDefaultText = text === DEFAULT_PREVIEW_TEXT;

  const handleResetText = useCallback(() => {
    if (isDefaultText) return;
    setText(DEFAULT_PREVIEW_TEXT);
    toast.success('Текст сброшен');
  }, [isDefaultText, setText]);

  return (
    <div className={`pointer-events-none flex min-w-0 w-full items-end justify-between gap-4 ${className}`.trim()}>
      <div className="pointer-events-auto min-w-0 flex-1 pl-6 text-xs uppercase text-gray-400 opacity-50 transition-opacity hover:opacity-100">
        Нажмите для редактирования текста
      </div>
      <button
        type="button"
        disabled={isDefaultText}
        onClick={handleResetText}
        className={`pointer-events-auto shrink-0 pr-6 text-xs font-semibold uppercase transition-opacity ${
          isDefaultText
            ? 'cursor-default text-gray-300 opacity-50'
            : 'text-accent opacity-80 hover:opacity-100'
        }`.trim()}
      >
        Сбросить текст
      </button>
    </div>
  );
}
