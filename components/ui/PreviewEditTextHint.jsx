import React from 'react';

/** Единая подсказка, как в PlainTextMode: нижний левый угол области превью. */
export function PreviewEditTextHint({ className = '' } = {}) {
  return (
    <div className={`pointer-events-none min-w-0 w-full ${className}`.trim()}>
      <div className="pointer-events-auto ml-6 text-xs uppercase text-gray-400 opacity-50 transition-opacity hover:opacity-100">
        Нажмите для редактирования текста
      </div>
    </div>
  );
}
