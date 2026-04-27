import React, { useRef, useEffect, useState } from 'react';
import { CustomSelect } from './ui/CustomSelect';
import { customSelectTriggerClass } from './ui/nativeSelectFieldClasses';
import { PopupDialogHeader } from './ui/PopupDialogHeader';
import { toast } from '../utils/appNotify';
import { saveBlobAsFile } from '../utils/fileDownloadUtils';
import { slugifyFontKey } from '../utils/fontSlug';

/**
 * Экспорт CSS: формат файла, предпросмотр, копирование, скачивание.
 */
const BINARY_EXPORT_FORMATS = new Set(['ttf', 'otf', 'woff', 'woff2']);

function mimeForFontFormat(format) {
  switch (String(format || '').toLowerCase()) {
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

export default function ExportModal({
  isOpen,
  onClose,
  cssCode,
  fontName,
  selectedFont,
  variableSettings,
  generateStaticFontFile,
  downloadFile,
}) {
  const textareaRef = useRef(null);
  const codeScrollHideTimerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [exportKind, setExportKind] = useState('css');
  const [copied, setCopied] = useState(false);
  const [isCodeScrollActive, setIsCodeScrollActive] = useState(false);

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

  useEffect(() => {
    return () => {
      if (codeScrollHideTimerRef.current) {
        clearTimeout(codeScrollHideTimerRef.current);
      }
    };
  }, []);

  const copyToClipboard = () => {
    const textToCopy = String(cssCode || '');
    if (!textToCopy) return;
    const applyCopiedState = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1000);
    };
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).then(applyCopiedState).catch(() => {
        if (!textareaRef.current) return;
        textareaRef.current.select();
        document.execCommand('copy');
        applyCopiedState();
      });
      return;
    }
    if (!textareaRef.current) return;
    textareaRef.current.select();
    document.execCommand('copy');
    applyCopiedState();
  };

  const downloadExport = async () => {
    if (BINARY_EXPORT_FORMATS.has(exportKind)) {
      if (!selectedFont?.isVariableFont || typeof generateStaticFontFile !== 'function') {
        toast.error('Бинарные форматы здесь доступны для вариативных шрифтов');
        return;
      }
      const blob = await generateStaticFontFile(selectedFont, variableSettings || {}, exportKind, {
        outputFontName: slugifyFontKey(fontName || selectedFont?.name || 'font'),
        skipPseudoCssPrompt: true,
      });
      if (!blob) return;
      const filename = `${slugifyFontKey(fontName || selectedFont?.name || 'font')}-export.${exportKind}`;
      if (typeof downloadFile === 'function') {
        downloadFile(blob, filename, mimeForFontFormat(exportKind));
      } else {
        saveBlobAsFile(blob, filename);
      }
      return;
    }
    const ext = exportKind === 'css' ? 'css' : 'txt';
    const mime = exportKind === 'css' ? 'text/css' : 'text/plain';
    const blob = new Blob([cssCode || ''], { type: mime });
    saveBlobAsFile(blob, `${slugifyFontKey(fontName || 'font')}-export.${ext}`);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleCodeScroll = () => {
    setIsCodeScrollActive(true);
    if (codeScrollHideTimerRef.current) {
      clearTimeout(codeScrollHideTimerRef.current);
    }
    codeScrollHideTimerRef.current = window.setTimeout(() => {
      setIsCodeScrollActive(false);
      codeScrollHideTimerRef.current = null;
    }, 650);
  };

  if (!isOpen) return null;

  const isTextExport = exportKind === 'css' || exportKind === 'plain';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center duration-300 ease-in-out ${
        isVisible ? 'bg-black/30' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`flex max-h-[90vh] w-11/12 max-w-2xl flex-col overflow-hidden rounded-none bg-white shadow-xl transition-all duration-300 ease-in-out ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <PopupDialogHeader title="Экспорт" onClose={onClose} titleClassName="max-w-[calc(100%-3rem)] truncate" />

        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="mb-4">
            <label className="block text-sm text-gray-700">
              <span className="mb-1 block font-medium uppercase">Формат файла</span>
              <CustomSelect
                id="export-format-select"
                className={customSelectTriggerClass()}
                value={exportKind}
                onChange={setExportKind}
                aria-label="Формат экспорта"
                options={[
                  { value: 'css', label: 'CSS (.css) — стили и пример' },
                  { value: 'plain', label: 'Текст (.txt) — то же содержимое' },
                  { value: 'ttf', label: 'TTF' },
                  { value: 'otf', label: 'OTF' },
                  { value: 'woff', label: 'WOFF' },
                  { value: 'woff2', label: 'WOFF2' },
                ]}
              />
            </label>
            <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-snug text-gray-700">
              В блоке <code className="rounded bg-white px-1">@font-face</code> замените{' '}
              <code className="rounded bg-white px-1">url(...)</code> на URL вашего хостинга шрифтов.
            </div>
          </div>

          <div className="relative rounded-md border border-gray-200 bg-gray-50 py-4 pl-4 pr-1 shadow-inner">
            {isTextExport ? (
              <>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-black transition-colors hover:border-black hover:bg-black hover:text-white"
                  aria-label="Копировать код"
                  title={copied ? 'Скопировано' : 'Копировать'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                    <path d="M8.25 8.25h9.5v9.5h-9.5z" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M6.25 15.75h-1v-10.5h10.5v1" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </button>
                <textarea
                  ref={textareaRef}
                  className={`code-scrollbar h-64 w-full resize-none overflow-y-auto bg-transparent pr-10 font-mono text-sm focus:outline-none ${
                    isCodeScrollActive ? 'code-scrollbar-visible' : ''
                  }`}
                  value={cssCode}
                  onScroll={handleCodeScroll}
                  readOnly
                />
              </>
            ) : (
              <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-gray-600">
                Формат <strong className="mx-1 uppercase text-gray-900">{exportKind}</strong> будет сгенерирован по
                текущим настройкам осей и скачан как файл шрифта.
              </div>
            )}
          </div>

          <p className="mt-3 text-sm text-gray-600">
            В пакет входят правило @font-face, при необходимости переменные осей VF и пример класса под текущее
            превью.
          </p>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md min-h-8 border border-gray-200 px-4 py-2 text-sm font-semibold uppercase text-gray-700 transition-colors hover:bg-black/[0.9] hover:border-black/[0.9] hover:text-white"
          >
            Отменить
          </button>
          <button
            type="button"
            onClick={downloadExport}
            className="w-full inline-flex items-center justify-center rounded-md min-h-8 border border-accent bg-accent px-4 py-2 text-sm font-semibold uppercase text-white transition-colors hover:bg-accent-hover"
          >
            Скачать файл
          </button>
        </div>
      </div>
    </div>
  );
}
