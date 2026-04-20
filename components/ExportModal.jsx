import React, { useRef, useEffect, useState } from 'react';
import { CustomSelect } from './ui/CustomSelect';
import { customSelectTriggerClass } from './ui/nativeSelectFieldClasses';

/**
 * Экспорт CSS: формат файла, предпросмотр, копирование, скачивание.
 */
export default function ExportModal({ isOpen, onClose, cssCode, fontName }) {
  const textareaRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [exportKind, setExportKind] = useState('css');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => {
        document.body.style.overflow = '';
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  const copyToClipboard = () => {
    if (!textareaRef.current) return;
    textareaRef.current.select();
    document.execCommand('copy');
  };

  const downloadFile = () => {
    const ext = exportKind === 'css' ? 'css' : 'txt';
    const mime = exportKind === 'css' ? 'text/css' : 'text/plain';
    const blob = new Blob([cssCode || ''], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(fontName || 'font').replace(/\s+/g, '-').toLowerCase()}-export.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center duration-300 ease-in-out ${
        isVisible ? 'bg-black/30' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`flex max-h-[90vh] w-11/12 max-w-2xl flex-col rounded-lg bg-white shadow-xl transition-all duration-300 ease-in-out ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="max-w-[calc(100%-2rem)] truncate text-lg font-medium text-gray-900">Экспорт</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
            aria-label="Закрыть"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium">Формат файла</span>
              <CustomSelect
                id="export-format-select"
                className={customSelectTriggerClass()}
                value={exportKind}
                onChange={setExportKind}
                aria-label="Формат экспорта"
                options={[
                  { value: 'css', label: 'CSS (.css) — стили и пример' },
                  { value: 'plain', label: 'Текст (.txt) — то же содержимое' },
                ]}
              />
            </label>
            <div className="rounded-md border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs leading-snug text-amber-950">
              В <code className="rounded bg-amber-100/90 px-1">@font-face</code> замените{' '}
              <code className="rounded bg-amber-100/90 px-1">url(...)</code> на свой хостинг шрифта.
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-4 shadow-inner">
            <textarea
              ref={textareaRef}
              className="h-64 w-full resize-none bg-transparent font-mono text-sm focus:outline-none"
              value={cssCode}
              readOnly
            />
          </div>

          <p className="mt-3 text-sm text-gray-600">
            В пакет входят правило @font-face, при необходимости переменные осей VF и пример класса под текущее
            превью.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200/80"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex items-center rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            Копировать
          </button>
          <button
            type="button"
            onClick={downloadFile}
            className="flex items-center rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            Скачать файл
          </button>
        </div>
      </div>
    </div>
  );
}
