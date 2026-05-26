import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppButton } from '../ui/AppButton';
import { PopupDialogHeader } from '../ui/PopupDialogHeader';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { CatalogCheckboxMark } from './CatalogCheckbox';

const DEFAULT_FORMATS = ['woff2', 'ttf', 'otf', 'woff'];

function styleRowKey(row) {
  return `${Number(row?.weight) || 0}:${row?.style === 'italic' ? 'italic' : 'normal'}`;
}

export function FontStyleDownloadDialog({
  open,
  onClose,
  familyLabel = '',
  styles = [],
  formats = DEFAULT_FORMATS,
  onDownload,
}) {
  const panelRef = useRef(null);
  const openedSessionRef = useRef(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [format, setFormat] = useState('woff2');
  const [busy, setBusy] = useState(false);

  const styleList = Array.isArray(styles) ? styles : [];
  const formatList = (Array.isArray(formats) ? formats : DEFAULT_FORMATS).map((f) =>
    String(f || '').toLowerCase(),
  );

  useDismissibleLayer({
    open,
    refs: [panelRef],
    onDismiss: () => !busy && onClose?.(),
  });

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      openedSessionRef.current = false;
      return;
    }
    if (openedSessionRef.current) return;
    openedSessionRef.current = true;
    const regular = styleList.find((s) => s.label === 'Regular') || styleList[0];
    setSelectedKeys(regular ? new Set([styleRowKey(regular)]) : new Set());
    setFormat(formatList.includes('woff2') ? 'woff2' : formatList[0] || 'woff2');
    setBusy(false);
  }, [open, styleList, formatList]);

  if (!open || typeof document === 'undefined') return null;

  const toggleStyle = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedStyles = styleList.filter((s) => selectedKeys.has(styleRowKey(s)));
  const canSubmit = selectedStyles.length > 0 && !busy;

  const runDownload = () => {
    if (!canSubmit || typeof onDownload !== 'function') return;
    setBusy(true);
    void (async () => {
      try {
        const ok = await onDownload(selectedStyles, format);
        if (ok !== false) onClose?.();
      } finally {
        setBusy(false);
      }
    })();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center bg-black/30 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="font-style-download-title"
      onClick={() => !busy && onClose?.()}
    >
      <div
        ref={panelRef}
        className="flex max-h-[min(88vh,640px)] w-full max-w-md flex-col overflow-hidden bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <PopupDialogHeader
          title="Начертания"
          titleClassName="!text-base"
          onClose={() => !busy && onClose?.()}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {familyLabel ? (
            <p className="mb-3 truncate text-xs font-semibold uppercase text-gray-500">{familyLabel}</p>
          ) : null}

          <div className="mb-4 flex flex-wrap gap-2">
            {formatList.map((fmt) => {
              const active = format === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  disabled={busy}
                  onClick={() => setFormat(fmt)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                    active
                      ? 'border-accent bg-accent text-white'
                      : 'border-gray-200 text-gray-800 hover:border-gray-900 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              );
            })}
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase text-gray-600">Начертания</p>
          <ul className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
            {styleList.map((row) => {
              const key = styleRowKey(row);
              const checked = selectedKeys.has(key);
              return (
                <li key={key}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded px-2 py-2 text-sm transition-colors ${
                      checked ? 'bg-accent/10 text-gray-900' : 'text-gray-900 hover:bg-gray-50'
                    } ${busy ? 'cursor-default opacity-60' : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={busy}
                      onChange={() => toggleStyle(key)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <CatalogCheckboxMark checked={checked} />
                    <span className="min-w-0 flex-1 truncate font-medium">{row.label}</span>
                    <span className="shrink-0 tabular-nums text-xs text-gray-500">
                      {row.weight}
                      {row.style === 'italic' ? ' Italic' : ''}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {styleList.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-500">Нет доступных начертаний для скачивания</p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-gray-200 px-5 py-4">
          <AppButton type="button" variant="outline" fullWidth disabled={busy} onClick={() => onClose?.()}>
            Отмена
          </AppButton>
          <AppButton type="button" variant="accent" fullWidth disabled={!canSubmit} onClick={runDownload}>
            {busy ? 'Скачивание…' : 'Скачать'}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
