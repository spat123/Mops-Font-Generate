import React from 'react';

/**
 * Подсказка о drag-and-drop порядке карточек в сохранённой библиотеке.
 * Позиция как у PreviewEditTextHint: нижний левый угол области.
 */
export function LibraryReorderHint() {
  return (
    <div className="absolute bottom-5 left-0 text-xs uppercase text-gray-400 opacity-50 transition-opacity hover:opacity-100">
      Перетаскивайте карточки, чтобы менять порядок в библиотеке.
    </div>
  );
}
