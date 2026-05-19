import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { CustomSelect } from './ui/CustomSelect';
import { customSelectTriggerClass } from './ui/nativeSelectFieldClasses';
import { PopupDialogHeader } from './ui/PopupDialogHeader';
import { AppButton } from './ui/AppButton';
import { toast } from '../utils/appNotify';
import { saveBlobAsFile } from '../utils/fileDownloadUtils';
import { slugifyFontKey } from '../utils/fontSlug';
import { SegmentedControl, VIEW_MODE_OPTIONS } from './ui/SegmentedControl';
import {
  buildGlyphTableCsv,
  buildGlyphTableHtml,
  buildGlyphTableJson,
  buildPlainPreviewSvgPayload,
  buildPrintToPdfHtmlDocument,
  buildStylesInventoryCsv,
  buildStylesInventoryMarkdown,
  buildWaterfallLadderMarkdown,
  loadGlyphTableForExport,
  renderPlainTextToImageBlob,
} from '../utils/previewExportArtifacts';

/**
 * Экспорт по режимам превью: Plain / Waterfall / Glyphs / Styles.
 * Бинарные шрифты VF — как раньше; текст/CSS/растр/PDF — по тарифу Pro (кроме открытых CSV/JSON/MD где указано).
 */
const BINARY_EXPORT_FORMATS = new Set(['ttf', 'otf', 'woff', 'woff2']);

/** Нужен тариф Pro для скачивания (копирование — те же правила, что и для CSS). */
const PRO_DOWNLOAD_FORMATS = new Set([
  'css',
  'plain',
  'png',
  'jpeg',
  'webp',
  'svg',
  'pdf-html',
  'glyph-html',
  'styles-html',
]);

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
    { value: 'pdf-html', label: 'PDF: HTML для печати в PDF (A4)' },
  ],
  waterfall: [
    { value: 'css', label: 'CSS (.css) — пакет как в Plain' },
    { value: 'plain', label: 'Текст (.txt)' },
    { value: 'md-ladder', label: 'Markdown — параметры Waterfall' },
    { value: 'pdf-html', label: 'PDF: HTML для печати в PDF' },
  ],
  glyphs: [
    { value: 'csv', label: 'CSV — таблица глифов (;)' },
    { value: 'json', label: 'JSON — глифы' },
    { value: 'glyph-html', label: 'HTML — таблица глифов (страница)' },
    { value: 'md-glyphs', label: 'Markdown — пояснение к выгрузке' },
  ],
  styles: [
    { value: 'md-styles', label: 'Markdown — сводка начертаний / осей' },
    { value: 'csv-styles', label: 'CSV — сводка для таблиц' },
    { value: 'styles-html', label: 'HTML — спецификация (карточки)' },
    { value: 'pdf-html', label: 'PDF: HTML для печати в PDF' },
  ],
};

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

/** Тот же MIME, что уходит в файл PNG / JPEG / WebP. */
function rasterExportMime(exportKind) {
  if (exportKind === 'jpeg') return 'image/jpeg';
  if (exportKind === 'webp') return 'image/webp';
  return 'image/png';
}

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

function firstFormatForTab(tab) {
  const list = FORMAT_OPTIONS_BY_TAB[tab] || FORMAT_OPTIONS_BY_TAB.plain;
  return list[0]?.value || 'css';
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
  /** Текущий режим превью в редакторе (при открытии совпадает с вкладкой экспорта). */
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
  const [exportKind, setExportKind] = useState('css');
  const [copied, setCopied] = useState(false);
  const [isCodeScrollActive, setIsCodeScrollActive] = useState(false);
  const [glyphData, setGlyphData] = useState(null);
  const [glyphLoadError, setGlyphLoadError] = useState(null);
  const [rasterPreviewUrl, setRasterPreviewUrl] = useState(null);

  const isPlainRasterExport = useMemo(
    () => exportTab === 'plain' && ['png', 'jpeg', 'webp'].includes(exportKind),
    [exportTab, exportKind],
  );

  const isVf = Boolean(selectedFont?.isVariableFont);
  const staticExportBlocked = Boolean(selectedFont) && !isVf && !canExportTextCss;

  const formatOptions = useMemo(() => FORMAT_OPTIONS_BY_TAB[exportTab] || FORMAT_OPTIONS_BY_TAB.plain, [exportTab]);

  const isProGatedFormat = useCallback((kind) => PRO_DOWNLOAD_FORMATS.has(kind), []);
  const downloadLockedByPro = !canExportTextCss && isProGatedFormat(exportKind);

  const isTextFormat = exportKind === 'css' || exportKind === 'plain';
  const showTextTeaser = !canExportTextCss && isTextFormat;
  const showRealTextExport = canExportTextCss && isTextFormat;

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
    setExportKind(firstFormatForTab(exportTab));
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

  /** Превью растра = тот же снимок, что сохраняется в файл (canvas → blob). */
  useEffect(() => {
    if (!isOpen || !isPlainRasterExport || !canExportTextCss) {
      setRasterPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return undefined;
    }

    let cancelled = false;
    const debounceMs = 220;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const mime = rasterExportMime(exportKind);
          const blob = await renderPlainTextToImageBlob({
            text: previewText,
            fontFamily,
            fontSizePx: fontSize,
            lineHeight,
            letterSpacingEm: (Number(letterSpacing) / 100) * 0.5,
            textColor,
            backgroundColor,
            mime,
          });
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setRasterPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } catch {
          if (!cancelled) {
            setRasterPreviewUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
          }
        }
      })();
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    isOpen,
    isPlainRasterExport,
    canExportTextCss,
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
    const baseName = slugifyFontKey(fontName || selectedFont?.name || 'font');
    if (exportTab === 'waterfall' && exportKind === 'md-ladder') {
      return buildWaterfallLadderMarkdown(waterfallExportMeta || {}, fontName || selectedFont?.name);
    }
    if (exportTab === 'glyphs') {
      if (!glyphData?.allGlyphs?.length) return glyphLoadError || 'Загрузка таблицы глифов…';
      if (exportKind === 'csv') return buildGlyphTableCsv(glyphData);
      if (exportKind === 'json') return buildGlyphTableJson(glyphData);
      if (exportKind === 'md-glyphs') {
        return [
          `# Глифы — ${fontName || selectedFont?.name || 'шрифт'}`,
          '',
          `- всего в выгрузке: **${glyphData.allGlyphs.length}**`,
          '',
          'Форматы **CSV** и **JSON** доступны без Pro. HTML-таблица — в Pro.',
          '',
          'Совет: откройте CSV в Excel / Numbers; для полного списка используйте JSON.',
        ].join('\n');
      }
      if (exportKind === 'glyph-html') {
        return '(Предпросмотр HTML в виде файла — скачайте, чтобы открыть в браузере)';
      }
    }
    if (exportTab === 'styles') {
      if (exportKind === 'md-styles') return buildStylesInventoryMarkdown(selectedFont);
      if (exportKind === 'csv-styles') return buildStylesInventoryCsv(selectedFont);
      if (exportKind === 'styles-html') return '(HTML-спецификация — скачайте файл)';
      if (exportKind === 'pdf-html') return '(HTML для печати в PDF — скачайте файл)';
    }
    if (exportTab === 'waterfall' && (exportKind === 'css' || exportKind === 'plain')) {
      const head =
        exportKind === 'css'
          ? `/* Waterfall: тот же @font-face / пример, что и в Plain. Добавьте размеры строк по лестнице из Markdown «Параметры Waterfall». */\n\n`
          : '';
      return head + String(cssCode || '');
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
    lineHeight,
    textColor,
    backgroundColor,
  ]);

  const copyToClipboard = () => {
    if (!canExportTextCss && isProGatedFormat(exportKind)) {
      toast.info('Копирование — в тарифе Pro');
      onRequestPro?.();
      return;
    }
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
    if (downloadLockedByPro) {
      toast.info('Этот формат — в тарифе Pro');
      onRequestPro?.();
      return;
    }

    const base = slugifyFontKey(fontName || selectedFont?.name || 'font');

    if (BINARY_EXPORT_FORMATS.has(exportKind)) {
      if (!selectedFont?.isVariableFont || typeof generateStaticFontFile !== 'function') {
        toast.error('Бинарные форматы здесь доступны для вариативных шрифтов');
        return;
      }
      const blob = await generateStaticFontFile(selectedFont, variableSettings || {}, exportKind, {
        outputFontName: base,
        skipPseudoCssPrompt: true,
        canExportTextCss,
      });
      if (!blob) return;
      const filename = `${base}-export.${exportKind}`;
      if (typeof downloadFile === 'function') {
        downloadFile(blob, filename, mimeForFontFormat(exportKind));
      } else {
        saveBlobAsFile(blob, filename);
      }
      return;
    }

    if (exportKind === 'png' || exportKind === 'jpeg' || exportKind === 'webp') {
      if (!canExportTextCss) {
        toast.info('Растр — в тарифе Pro');
        onRequestPro?.();
        return;
      }
      const mime = rasterExportMime(exportKind);
      try {
        const blob = await renderPlainTextToImageBlob({
          text: previewText,
          fontFamily,
          fontSizePx: fontSize,
          lineHeight,
          letterSpacingEm: (Number(letterSpacing) / 100) * 0.5,
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
      if (!canExportTextCss) {
        toast.info('SVG — в тарифе Pro');
        onRequestPro?.();
        return;
      }
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

    if (exportKind === 'pdf-html') {
      if (!canExportTextCss) {
        toast.info('Печать в PDF — в тарифе Pro');
        onRequestPro?.();
        return;
      }
      const inner =
        exportTab === 'styles'
          ? `<h1>${fontName || 'Шрифт'}</h1><pre style="white-space:pre-wrap;font-family:system-ui">${previewValue.replace(/</g, '&lt;')}</pre>`
          : `<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:13px">${String(cssCode || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')}</pre>`;
      const html = buildPrintToPdfHtmlDocument({
        title: `Экспорт — ${base}`,
        bodyHtml: inner,
        fontFamily,
        fontSizePx: Math.min(18, fontSize),
      });
      saveBlobAsFile(new Blob([html], { type: 'text/html;charset=utf-8' }), `${base}-print-to-pdf.html`);
      return;
    }

    if (exportKind === 'md-ladder') {
      const md = buildWaterfallLadderMarkdown(waterfallExportMeta || {}, fontName || selectedFont?.name);
      saveBlobAsFile(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${base}-waterfall.md`);
      return;
    }

    if (exportKind === 'md-styles') {
      const md = buildStylesInventoryMarkdown(selectedFont);
      saveBlobAsFile(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${base}-styles.md`);
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
      if (!canExportTextCss) {
        toast.info('HTML-таблица глифов — в тарифе Pro');
        onRequestPro?.();
        return;
      }
      if (!glyphData?.allGlyphs?.length) {
        toast.error('Нет данных глифов');
        return;
      }
      const html = buildGlyphTableHtml(glyphData, fontName || selectedFont?.name || 'font');
      saveBlobAsFile(new Blob([html], { type: 'text/html;charset=utf-8' }), `${base}-glyphs.html`);
      return;
    }

    if (exportKind === 'md-glyphs') {
      const md = [
        `# Глифы — ${fontName || selectedFont?.name || 'шрифт'}`,
        '',
        `- записей: ${glyphData?.allGlyphs?.length ?? 0}`,
        '',
        'Скачайте CSV или JSON для полной таблицы.',
      ].join('\n');
      saveBlobAsFile(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${base}-glyphs-readme.md`);
      return;
    }

    if (exportKind === 'styles-html') {
      if (!canExportTextCss) {
        toast.info('HTML — в тарифе Pro');
        onRequestPro?.();
        return;
      }
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
      if (!canExportTextCss) {
        toast.info('Скачивание CSS и текстовых файлов — в тарифе Pro');
        onRequestPro?.();
        return;
      }
      const ext = exportKind === 'css' ? 'css' : 'txt';
      const mime = exportKind === 'css' ? 'text/css' : 'text/plain';
      let body = String(cssCode || '');
      if (exportTab === 'waterfall' && exportKind === 'css') {
        body =
          `/* Waterfall: добавьте размеры строк по лестнице (см. Markdown-экспорт md-ladder). */\n\n` + body;
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
  const showPdfPlaceholder = exportTab === 'styles' && exportKind === 'pdf-html';

  const showBlurredCssTeaser = showTextTeaser;
  const showRasterDownloadPreview = isPlainRasterExport && canExportTextCss;
  const showRasterProTeaser = isPlainRasterExport && !canExportTextCss;
  const showMonospacePreview =
    !showBlurredCssTeaser &&
    !showBinaryHint &&
    !showGlyphHtmlPlaceholder &&
    !showStylesHtmlPlaceholder &&
    !showPdfPlaceholder &&
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
                    onChange={setExportKind}
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
                ) : showRasterProTeaser ? (
                  <BlurredProExportTeaser />
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
                ) : showBlurredCssTeaser ? (
                  <BlurredProExportTeaser />
                ) : showBinaryHint ? (
                  <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-gray-600">
                    Формат <strong className="mx-1 uppercase text-gray-900">{exportKind}</strong> будет сгенерирован по
                    текущим настройкам осей и скачан как файл шрифта.
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-gray-600">
                    {showGlyphHtmlPlaceholder || showStylesHtmlPlaceholder || showPdfPlaceholder
                      ? 'Содержимое в файле после скачивания. Нажмите «Скачать файл».'
                      : previewValue}
                  </div>
                )}
              </div>

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
              onClick={() => void downloadExport()}
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
