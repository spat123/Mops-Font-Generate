import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../utils/appNotify';
import { CustomSelect } from './ui/CustomSelect';
import { customSelectTriggerClass } from './ui/nativeSelectFieldClasses';
import DraggableValueRangeSlider from './ui/DraggableValueRangeSlider';
import { PopupDialogHeader } from './ui/PopupDialogHeader';

function slugFileBase(name) {
  const s = String(name || 'font')
    .trim()
    .replace(/\.[a-zA-Z0-9]+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_]/g, '')
    .slice(0, 80);
  return s || 'font';
}

function mimeForFormat(format) {
  switch (String(format).toLowerCase()) {
    case 'ttf':
      return 'font/ttf';
    case 'otf':
      return 'font/otf';
    case 'woff':
      return 'font/woff';
    case 'woff2':
      return 'font/woff2';
    default:
      return 'font/ttf';
  }
}

/**
 * Генерация статического файла из VF: имя, формат, при необходимости правка веса (wght).
 */
export default function GenerateFontModal({
  isOpen,
  onClose,
  selectedFont,
  variableSettings,
  generateStaticFontFile,
  downloadFile,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [outputName, setOutputName] = useState('');
  const [format, setFormat] = useState('woff2');
  const [genSettings, setGenSettings] = useState({});
  const [busy, setBusy] = useState(false);
  const wasOpenRef = useRef(false);

  const wghtAxis = selectedFont?.variableAxes?.wght;
  const hasWght = wghtAxis && typeof wghtAxis === 'object';

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
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (justOpened && selectedFont) {
      setOutputName(slugFileBase(selectedFont.name || selectedFont.fontFamily || 'MyFont'));
      setGenSettings({ ...(variableSettings && typeof variableSettings === 'object' ? variableSettings : {}) });
      setFormat('woff2');
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- снимок variableSettings только при открытии
  }, [isOpen, selectedFont]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const axisSummary = useMemo(() => {
    const o = genSettings || {};
    return Object.entries(o)
      .map(([k, v]) => `${k}: ${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`)
      .join(' В· ');
  }, [genSettings]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleGenerate = async () => {
    if (!selectedFont?.isVariableFont) {
      toast.error('Выберите вариативный шрифт');
      return;
    }
    const base = slugFileBase(outputName);
    setBusy(true);
    try {
      const blob = await generateStaticFontFile(selectedFont, genSettings, format, {
        outputFontName: base,
        skipPseudoCssPrompt: true,
      });
      if (blob) {
        const filename = `${base}-static.${format}`;
        downloadFile(blob, filename, mimeForFormat(format));
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const vf = Boolean(selectedFont?.isVariableFont);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center duration-300 ease-in-out ${
        isVisible ? 'bg-black/30' : 'bg-black/0'
      }`}
      onClick={handleBackdrop}
    >
      <div
        className={`max-h-[90vh] w-11/12 max-w-lg overflow-y-auto rounded-none bg-white shadow-xl transition-all duration-300 ease-in-out ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <PopupDialogHeader title="Генерация шрифта" onClose={onClose} />

        <div className="space-y-4 px-6 py-4">
          {!vf && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Статический файл из осей сейчас строится для <strong>вариативных</strong> шрифтов. Выберите VF в
              сессии.
            </p>
          )}

          <label className="block text-sm text-gray-800">
            <span className="mb-1 block font-medium">Имя файла (без расширения)</span>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              disabled={!vf || busy}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black/[0.14] focus:outline-none"
              placeholder="MyFont"
              autoComplete="off"
            />
          </label>

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-800">Тип / стиль для файла</span>
            <p className="mb-2 text-xs text-gray-600">
              Берутся оси из текущего превью. Ниже можно подправить вес (wght), если ось есть — остальные оси как в
              превью: {axisSummary || '—'}
            </p>
            {vf && hasWght && (
              <div className="variable-font-slider-container rounded-md border border-gray-100 bg-gray-50/80 px-2 py-2">
                <span className="mb-1 block text-xs text-gray-600">Вес (wght)</span>
                <DraggableValueRangeSlider
                  min={wghtAxis.min}
                  max={wghtAxis.max}
                  step={1}
                  value={genSettings.wght ?? wghtAxis.default ?? 400}
                  defaultMarkerValue={wghtAxis.default}
                  onChange={(v) => setGenSettings((prev) => ({ ...prev, wght: v }))}
                  formatDisplay={(x) => String(Math.round(x))}
                />
              </div>
            )}
            {vf && !hasWght && (
              <p className="text-xs text-gray-500">Ось wght в метаданных не найдена — значения осей только как в превью.</p>
            )}
          </div>

          <label className="block text-sm text-gray-800">
            <span className="mb-1 block font-medium">Формат генерации</span>
            <CustomSelect
              id="generate-font-format"
              className={customSelectTriggerClass()}
              value={format}
              onChange={setFormat}
              disabled={!vf || busy}
              aria-label="Формат файла шрифта"
              options={[
                { value: 'ttf', label: 'TTF' },
                { value: 'otf', label: 'OTF' },
                { value: 'woff', label: 'WOFF' },
                { value: 'woff2', label: 'WOFF2' },
              ]}
            />
          </label>

          <p className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs leading-snug text-gray-600">
            При отсутствии серверной генерации используется псевдо-статика (тот же файл с фиксацией осей в CSS) —
            см. уведомления после запуска.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md min-h-8 border border-gray-200 px-4 py-2 text-sm font-semibold uppercase text-gray-700 transition-colors hover:bg-black/[0.9] hover:border-black/[0.9] hover:text-white"
            disabled={busy}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!vf || busy}
            className="rounded-md min-h-8 border border-accent bg-accent px-4 py-2 text-sm font-semibold uppercase text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Генерация…' : 'Сгенерировать и скачать'}
          </button>
        </div>
      </div>
    </div>
  );
}

