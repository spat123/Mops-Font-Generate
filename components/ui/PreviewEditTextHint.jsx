import React from 'react';

/** Единая подсказка, как в PlainTextMode: нижний левый угол области превью. */
export function PreviewEditTextHint() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-0 z-20">
      <div className="pointer-events-auto ml-6 text-xs uppercase text-gray-400 opacity-50 transition-opacity hover:opacity-100">
        Нажмите для редактирования текста
      </div>
    </div>
  );
}
