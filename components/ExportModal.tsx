import { useRef, useEffect, useState, useMemo } from 'react';
import { CustomSelect } from './ui/CustomSelect';
import { customSelectTriggerClass } from './ui/nativeSelectFieldClasses';
import { PopupDialogHeader } from './ui/PopupDialogHeader';
import { AppButton } from './ui/AppButton';
import { toast } from '../utils/appNotify';
import { pickSelectValue } from '../utils/pickSelectValue';
import { saveBlobAsFile } from '../utils/fileDownloadUtils';
import { mimeTypeForFontExt } from '../utils/fontFormatConvertClient';
import { letterSpacingPercentToEmValue } from '../utils/editorTypography';
import { slugifyFontKey } from '../utils/fontSlug';
import { SegmentedControl, VIEW_MODE_OPTIONS } from './ui/SegmentedControl';
import {
  buildGlyphTableCsv,
  buildGlyphTableHtml,
  buildGlyphTableJson,
  buildPlainPreviewSvgPayload,
  buildStylesInventoryCsv,
  buildStylesInventoryMarkdown,
  buildWaterfallLadderCssComments,
  buildWaterfallLadderPlainText,
  loadGlyphTableForExport,
  renderPlainTextToImageBlob,
} from '../utils/previewExportArtifacts';

/** Экспорт по режимам превью: Plain / Waterfall / Glyphs / Styles. Все форматы бесплатны. */
const BINARY_EXPORT_FORMATS = new Set(['ttf', 'otf', 'woff', 'woff2']);

const FORMAT_OPTIONS_BY_TAB = {
  plain: [
    { value: 'css', label: 'CSS (.css) — @font-face и пример' },
    { value: 'plain', label: 'Текст (.txt) — то же содержимое' },
    { value: 'ttf', label: 'TTF' },
    { value: 'otf', label: 'OTF' },
    { value: 'woff', label: 'WOFF' },
    { value: 'woff2', label: 'WOFF2' },
    { value: 'png', label: 'PNG — снимок текста (растр)' },
    { value: 'jpeg', label: 'JPEG — снимок текста' },
    { value: 'webp', label: 'WebP — снимок текста' },
    { value: 'svg', label: 'SVG — текст как вектор' },
  ],
  waterfall: [
    { value: 'css', label: 'CSS (.css) — @font-face + размеры лестницы' },
    { value: 'plain', label: 'Текст (.txt) — то же содержимое' },
  ],
  glyphs: [
    { value: 'csv', label: 'CSV — таблица глифов (;)' },
    { value: 'json', label: 'JSON — глифы' },
    { value: 'glyph-html', label: 'HTML — таблица глифов (страница)' },
  ],
  styles: [
    { value: 'csv-styles', label: 'CSV — сводка начертаний / осей' },
    { value: 'styles-html', label: 'HTML — спецификация (карточки)' },
  ],
};

function rasterExportMime(exportKind) {
  if (exportKind === 'jpeg') return 'image/jpeg';
  if (exportKind === 'webp') return 'image/webp';
  return 'image/png';
}

function defaultFormatForTab(tab) {
  if (tab === 'plain') return 'woff';
  const list = FORMAT_OPTIONS_BY_TAB[tab] || FORMAT_OPTIONS_BY_TAB.plain;
  return list[0]?.value || 'css';
}

function buildWaterfallExportBody(cssCode, waterfallExportMeta, fontName, asCss) {
  const core = String(cssCode || '');
  const name = fontName || '';
  const meta = waterfallExportMeta || {};
  if (asCss) {
    return `${buildWaterfallLadderCssComments(meta, name)}${core}`;
  }
  return `${buildWaterfallLadderPlainText(meta, name)}${core}`;
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
  editorViewMode = 'plain',
  previewText = '',
  fontFamily = 'sans-serif',
  fontSize = 32,
  lineHeight = 1.4,
  letterSpacing = 0,
  textColor = '#111111',
  backgroundColor = '#ffffff',
  waterfallExportMeta = null,
}) {
  const textareaRef = useRef(null);
  const codeScrollHideTimerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [exportTab, setExportTab] = useState('plain');
  const [exportKind, setExportKind] = useState('woff');
  const [copied, setCopied] = useState(false);
  const [isCodeScrollActive, setIsCodeScrollActive] = useState(false);
  const [glyphData, setGlyphData] = useState(null);
  const [glyphLoadError, setGlyphLoadError] = useState(null);
  const [rasterPreviewUrl, setRasterPreviewUrl] = useState(null);

  const isPlainRasterExport = useMemo(
    () => exportTab === 'plain' && ['png', 'jpeg', 'webp'].includes(exportKind),
    [exportTab, exportKind],
  );

  const formatOptions = useMemo(() => FORMAT_OPTIONS_BY_TAB[exportTab] || FORMAT_OPTIONS_BY_TAB.plain, [exportTab]);

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
    if (!isOpen) return;
    setExportTab(editorViewMode in FORMAT_OPTIONS_BY_TAB ? editorViewMode : 'plain');
  }, [isOpen, editorViewMode]);

  useEffect(() => {
    setExportKind(defaultFormatForTab(exportTab));
  }, [exportTab]);

  useEffect(() => {
    if (!isOpen || exportTab !== 'glyphs' || !selectedFont) {
      setGlyphData(null);
      setGlyphLoadError(null);
      return undefined;
    }
    let cancelled = false;
    setGlyphLoadError(null);
    void (async () => {
      const data = await loadGlyphTableForExport(selectedFont);
      if (cancelled) return;
      if (!data?.allGlyphs?.length) {
        setGlyphData(null);
        setGlyphLoadError('Не удалось прочитать глифы (нужен файл шрифта или доступный URL).');
        return;
      }
      setGlyphData(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, exportTab, selectedFont]);

  useEffect(() => {
    if (!isOpen || !isPlainRasterExport) {
      setRasterPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return undefined;
    }

    let cancelled = false;
    const mime = rasterExportMime(exportKind);
    void (async () => {
      try {
        const blob = await renderPlainTextToImageBlob({
          text: previewText,
          fontFamily,
          fontSizePx: fontSize,
          lineHeight,
          letterSpacingEm: letterSpacingPercentToEmValue(letterSpacing),
          textColor,
          backgroundColor,
          mime,
        });
        if (cancelled) return;
        setRasterPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } catch {
        if (!cancelled) setRasterPreviewUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    isPlainRasterExport,
    exportKind,
    previewText,
    fontFamily,
    fontSize,
    lineHeight,
    letterSpacing,
    textColor,
    backgroundColor,
  ]);

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

  const previewValue = useMemo(() => {
    if (exportTab === 'glyphs') {
      if (!glyphData?.allGlyphs?.length) return glyphLoadError || 'Загрузка таблицы глифов…';
      if (exportKind === 'csv') return buildGlyphTableCsv(glyphData);
      if (exportKind === 'json') return buildGlyphTableJson(glyphData);
      if (exportKind === 'glyph-html') {
        return '(Предпросмотр HTML в виде файла — скачайте, чтобы открыть в браузере)';
      }
    }
    if (exportTab === 'styles') {
      if (exportKind === 'csv-styles') return buildStylesInventoryCsv(selectedFont);
      if (exportKind === 'styles-html') return '(HTML-спецификация — скачайте файл)';
    }
    if (exportTab === 'waterfall' && (exportKind === 'css' || exportKind === 'plain')) {
      return buildWaterfallExportBody(
        cssCode,
        waterfallExportMeta,
        fontName || selectedFont?.name,
        exportKind === 'css',
      );
    }
    if (exportTab === 'plain' && exportKind === 'svg') {
      return buildPlainPreviewSvgPayload({
        text: previewText,
        fontFamily,
        fontSizePx: fontSize,
        textColor,
        backgroundColor,
      });
    }
    if (exportTab === 'plain' && ['png', 'jpeg', 'webp'].includes(exportKind)) {
      return '';
    }
    return String(cssCode || '');
  }, [
    cssCode,
    exportKind,
    exportTab,
    fontName,
    selectedFont,
    waterfallExportMeta,
    glyphData,
    glyphLoadError,
    previewText,
    fontFamily,
    fontSize,
    textColor,
    backgroundColor,
  ]);

  const copyToClipboard = () => {
    const textToCopy = String(previewValue || '');
    if (!textToCopy || textToCopy.startsWith('(')) return;
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
    const base = slugifyFontKey(fontName || selectedFont?.name || 'font');

    if (BINARY_EXPORT_FORMATS.has(exportKind)) {
      if (!selectedFont?.isVariableFont || typeof generateStaticFontFile !== 'function') {
        toast.error('Бинарные форматы здесь доступны для вариативных шрифтов');
        return;
      }
      const blob = await generateStaticFontFile(selectedFont, variableSettings || {}, exportKind, {
        outputFontName: base,
        skipPseudoCssPrompt: true,
        canExportTextCss: true,
      });
      if (!blob) return;
      const filename = `${base}-export.${exportKind}`;
      if (typeof downloadFile === 'function') {
        downloadFile(blob, filename, mimeTypeForFontExt(exportKind));
      } else {
        saveBlobAsFile(blob, filename);
      }
      return;
    }

    if (exportKind === 'png' || exportKind === 'jpeg' || exportKind === 'webp') {
      const mime = rasterExportMime(exportKind);
      try {
        const blob = await renderPlainTextToImageBlob({
          text: previewText,
          fontFamily,
          fontSizePx: fontSize,
          lineHeight,
          letterSpacingEm: letterSpacingPercentToEmValue(letterSpacing),
          textColor,
          backgroundColor,
          mime,
        });
        saveBlobAsFile(blob, `${base}-plain-preview.${exportKind === 'jpeg' ? 'jpg' : exportKind}`);
      } catch (e) {
        toast.error(e?.message || 'Не удалось создать изображение');
      }
      return;
    }

    if (exportKind === 'svg') {
      const svg = buildPlainPreviewSvgPayload({
        text: previewText,
        fontFamily,
        fontSizePx: fontSize,
        textColor,
        backgroundColor,
      });
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      saveBlobAsFile(blob, `${base}-plain-preview.svg`);
      return;
    }

    if (exportKind === 'csv-styles') {
      const csv = buildStylesInventoryCsv(selectedFont);
      saveBlobAsFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${base}-styles.csv`);
      return;
    }

    if (exportKind === 'csv') {
      if (!glyphData?.allGlyphs?.length) {
        toast.error('Нет данных глифов');
        return;
      }
      const csv = buildGlyphTableCsv(glyphData);
      saveBlobAsFile(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${base}-glyphs.csv`);
      return;
    }

    if (exportKind === 'json') {
      if (!glyphData?.allGlyphs?.length) {
        toast.error('Нет данных глифов');
        return;
      }
      const json = buildGlyphTableJson(glyphData);
      saveBlobAsFile(new Blob([json], { type: 'application/json;charset=utf-8' }), `${base}-glyphs.json`);
      return;
    }

    if (exportKind === 'glyph-html') {
      if (!glyphData?.allGlyphs?.length) {
        toast.error('Нет данных глифов');
        return;
      }
      const html = buildGlyphTableHtml(glyphData, fontName || selectedFont?.name || 'font');
      saveBlobAsFile(new Blob([html], { type: 'text/html;charset=utf-8' }), `${base}-glyphs.html`);
      return;
    }

    if (exportKind === 'styles-html') {
      const md = buildStylesInventoryMarkdown(selectedFont);
      const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>Styles — ${base}</title>
<style>body{font-family:system-ui,sans-serif;max-width:52rem;margin:1.5rem auto;padding:0 1rem}pre{white-space:pre-wrap;background:#f8f8f9;padding:1rem;border:1px solid #e5e7eb}</style></head><body>
<h1>Styles — ${fontName || base}</h1>
<pre>${md.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
</body></html>`;
      saveBlobAsFile(new Blob([html], { type: 'text/html;charset=utf-8' }), `${base}-styles.html`);
      return;
    }

    if (exportKind === 'css' || exportKind === 'plain') {
      const ext = exportKind === 'css' ? 'css' : 'txt';
      const mime = exportKind === 'css' ? 'text/css' : 'text/plain';
      let body = String(cssCode || '');
      if (exportTab === 'waterfall') {
        body = buildWaterfallExportBody(body, waterfallExportMeta, fontName || selectedFont?.name, exportKind === 'css');
      }
      saveBlobAsFile(new Blob([body], { type: mime }), `${base}-export.${ext}`);
    }
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

  const tabOptions = VIEW_MODE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    title: o.title,
    Icon: o.Icon,
  }));

  const showBinaryHint = BINARY_EXPORT_FORMATS.has(exportKind);
  const showGlyphHtmlPlaceholder = exportTab === 'glyphs' && exportKind === 'glyph-html';
  const showStylesHtmlPlaceholder = exportTab === 'styles' && exportKind === 'styles-html';
  const showRasterDownloadPreview = isPlainRasterExport;
  const showMonospacePreview =
    !showBinaryHint &&
    !showGlyphHtmlPlaceholder &&
    !showStylesHtmlPlaceholder &&
    !isPlainRasterExport;

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
        <PopupDialogHeader title="Экспорт" onClose={onClose} titleClassName="max-w-[calc(100%-7rem)] truncate" />

        <div className="flex-1 overflow-auto space-y-4 p-6">
          <div className="min-w-0">
            <SegmentedControl
              value={exportTab}
              onChange={setExportTab}
              options={tabOptions}
              variant="surface"
              label="Режим экспорта"
              className="w-full min-w-0"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700">
              <CustomSelect
                id="export-format-select"
                className={customSelectTriggerClass()}
                value={exportKind}
                onChange={(v) => setExportKind(pickSelectValue(v))}
                aria-label="Формат экспорта"
                options={formatOptions}
              />
            </label>
          </div>

          <div className="relative rounded-md border border-gray-200 bg-gray-50 p-4 shadow-inner">
            {showRasterDownloadPreview ? (
              <div className="flex min-h-64 items-center justify-center overflow-auto px-2 py-2">
                {rasterPreviewUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob: тот же снимок, что в файле */}
                    <img
                      src={rasterPreviewUrl}
                      alt="Предпросмотр: так же будет выглядеть скачанный файл"
                      className="max-h-[min(24rem,65vh)] w-auto max-w-full object-contain shadow-sm"
                    />
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Готовим превью…</span>
                )}
              </div>
            ) : showMonospacePreview ? (
              <>
                <AppButton
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-2 z-[1] !h-8 !w-8 !min-h-8 !min-w-8 !border-gray-300 !p-0"
                  onClick={copyToClipboard}
                  aria-label="Копировать"
                  title={copied ? 'Скопировано' : 'Копировать'}
                  disabled={String(previewValue || '').startsWith('(')}
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
                  value={previewValue}
                  onScroll={handleCodeScroll}
                  readOnly
                />
              </>
            ) : showBinaryHint ? (
              <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-gray-600">
                Формат <strong className="mx-1 uppercase text-gray-900">{exportKind}</strong> будет сгенерирован по
                текущим настройкам осей и скачан как файл шрифта.
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-gray-600">
                {showGlyphHtmlPlaceholder || showStylesHtmlPlaceholder
                  ? 'Содержимое в файле после скачивания. Нажмите «Скачать файл».'
                  : previewValue}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-200 px-6 py-4">
          <AppButton type="button" variant="outline" fullWidth className="!min-h-8" onClick={onClose}>
            Отменить
          </AppButton>
          <AppButton
            type="button"
            variant="accent"
            fullWidth
            className="!min-h-8"
            onClick={() => void downloadExport()}
          >
            Скачать файл
          </AppButton>
        </div>
      </div>
    </div>
  );
}