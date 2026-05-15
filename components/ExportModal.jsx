import React, { useRef, useEffect, useState } from 'react';
import { CustomSelect } from './ui/CustomSelect';
import { customSelectTriggerClass } from './ui/nativeSelectFieldClasses';
import { PopupDialogHeader } from './ui/PopupDialogHeader';
import { AppButton } from './ui/AppButton';
import { toast } from '../utils/appNotify';
import { saveBlobAsFile } from '../utils/fileDownloadUtils';
import { slugifyFontKey } from '../utils/fontSlug';

/**
 * Экспорт CSS: формат файла, предпросмотр, копирование, скачивание.
 * Для Free: пример текстового пакета — только размытый плейсхолдер (без реального CSS в разметке);
 * скачивание .css / .txt и копирование — в Pro.
 */
const BINARY_EXPORT_FORMATS = new Set(['ttf', 'otf', 'woff', 'woff2']);

const ALL_FORMAT_OPTIONS = [
  { value: 'css', label: 'CSS (.css) — стили и пример' },
  { value: 'plain', label: 'Текст (.txt) — то же содержимое' },
  { value: 'ttf', label: 'TTF' },
  { value: 'otf', label: 'OTF' },
  { value: 'woff', label: 'WOFF' },
  { value: 'woff2', label: 'WOFF2' },
];

/** Условный пример: не реальный экспорт пользователя, только визуальный тизер под блюром. */
const PRO_CSS_PREVIEW_PLACEHOLDER = `/* Пример пакета Pro: @font-face и класс */
@font-face {
  font-family: "YourFont";
  src: url("...") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

:root {
  --font-wght: 400;
}

.preview-block {
  font-family: "YourFont", system-ui, sans-serif;
  font-variation-settings: "wght" var(--font-wght);
  font-size: 1.125rem;
  line-height: 1.5;
}
`;

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

/** Размытый плейсхолдер + подпись Pro (без ссылок и без реального кода пользователя). */
function BlurredProExportTeaser() {
  return (
    <div className="relative h-64 min-h-[16rem] overflow-hidden rounded-md border border-gray-200 bg-gray-50 shadow-inner">
      <pre
        className="pointer-events-none h-full w-full select-none overflow-hidden whitespace-pre-wrap break-words px-3 py-4 pb-8 font-mono text-[11px] leading-relaxed text-gray-800 blur-[7px] opacity-50"
        aria-hidden
      >
        {PRO_CSS_PREVIEW_PLACEHOLDER}
      </pre>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/20 via-white/40 to-white/65 px-4">
        <span className="rounded-md bg-gray-900 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg">
          Доступно в Pro
        </span>
      </div>
    </div>
  );
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
  canExportTextCss = true,
  onRequestPro,
}) {
  const textareaRef = useRef(null);
  const codeScrollHideTimerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [exportKind, setExportKind] = useState('css');
  const [copied, setCopied] = useState(false);
  const [isCodeScrollActive, setIsCodeScrollActive] = useState(false);

  const isVf = Boolean(selectedFont?.isVariableFont);
  const staticExportBlocked = Boolean(selectedFont) && !isVf && !canExportTextCss;

  const isTextFormat = exportKind === 'css' || exportKind === 'plain';
  const showTextTeaser = !canExportTextCss && isTextFormat;
  const showRealTextExport = canExportTextCss && isTextFormat;
  const downloadLockedByPro = showTextTeaser;

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
    if (!canExportTextCss) {
      toast.info('Копирование CSS и @font-face — в тарифе Pro');
      onRequestPro?.();
      return;
    }
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
    if (downloadLockedByPro) {
      toast.info('Скачивание CSS и текстовых файлов — в тарифе Pro');
      onRequestPro?.();
      return;
    }
    if (BINARY_EXPORT_FORMATS.has(exportKind)) {
      if (!selectedFont?.isVariableFont || typeof generateStaticFontFile !== 'function') {
        toast.error('Бинарные форматы здесь доступны для вариативных шрифтов');
        return;
      }
      const blob = await generateStaticFontFile(selectedFont, variableSettings || {}, exportKind, {
        outputFontName: slugifyFontKey(fontName || selectedFont?.name || 'font'),
        skipPseudoCssPrompt: true,
        canExportTextCss,
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
    if (!canExportTextCss) {
      toast.info('Скачивание CSS и текстовых файлов — в тарифе Pro');
      onRequestPro?.();
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
          {staticExportBlocked ? (
            <div className="space-y-4">
              <BlurredProExportTeaser />
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-gray-800">
                <p className="leading-relaxed text-gray-700">
                  Для статичного файла из этого окна доступен только текстовый пакет с @font-face (тариф Pro). Бинарная
                  выгрузка здесь недоступна — используйте вариативный шрифт или оформите Pro.
                </p>
                <AppButton type="button" className="mt-3 !min-h-9" variant="accent" onClick={() => onRequestPro?.()}>
                  Смотреть планы
                </AppButton>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block font-medium uppercase">Формат файла</span>
                  <CustomSelect
                    id="export-format-select"
                    className={customSelectTriggerClass()}
                    value={exportKind}
                    onChange={setExportKind}
                    aria-label="Формат экспорта"
                    options={ALL_FORMAT_OPTIONS}
                  />
                </label>
                {canExportTextCss ? (
                  <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-snug text-gray-700">
                    В блоке <code className="rounded bg-white px-1">@font-face</code> замените{' '}
                    <code className="rounded bg-white px-1">url(...)</code> на URL вашего хостинга шрифтов.
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs leading-snug text-gray-700">
                    Выберите CSS или «Текст», чтобы увидеть пример пакета (размытый, без ваших данных). Скачивание и
                    копирование кода — в Pro. Для вариативного шрифта на Free доступны форматы TTF / OTF / WOFF / WOFF2.
                  </div>
                )}
              </div>

              <div className="relative rounded-md border border-gray-200 bg-gray-50 py-4 pl-4 pr-1 shadow-inner">
                {showRealTextExport ? (
                  <>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-2 z-[1] !h-8 !w-8 !min-h-8 !min-w-8 !border-gray-300 !p-0"
                      onClick={copyToClipboard}
                      aria-label="Копировать код"
                      title={copied ? 'Скопировано' : 'Копировать'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                        <path d="M8.25 8.25h9.5v9.5h-9.5z" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M6.25 15.75h-1v-10.5h10.5v1" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </AppButton>
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
                ) : showTextTeaser ? (
                  <BlurredProExportTeaser />
                ) : (
                  <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-gray-600">
                    Формат <strong className="mx-1 uppercase text-gray-900">{exportKind}</strong> будет сгенерирован по
                    текущим настройкам осей и скачан как файл шрифта.
                  </div>
                )}
              </div>

              <p className="mt-3 text-sm text-gray-600">
                {canExportTextCss
                  ? 'В пакет входят правило @font-face, при необходимости переменные осей VF и пример класса под текущее превью.'
                  : 'На Free текстовый пакет с вашим @font-face не показывается и не скачивается — только пример выше; полный экспорт в Pro.'}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-gray-200 px-6 py-4">
          <AppButton type="button" variant="outline" fullWidth className="!min-h-8" onClick={onClose}>
            Отменить
          </AppButton>
          {staticExportBlocked ? (
            <AppButton type="button" variant="accent" fullWidth className="!min-h-8" onClick={() => onRequestPro?.()}>
              Тариф Pro
            </AppButton>
          ) : (
            <AppButton
              type="button"
              variant="accent"
              fullWidth
              className="!min-h-8"
              onClick={downloadExport}
              disabled={downloadLockedByPro}
              title={downloadLockedByPro ? 'Доступно в Pro' : undefined}
            >
              Скачать файл
            </AppButton>
          )}
        </div>
      </div>
    </div>
  );
}
