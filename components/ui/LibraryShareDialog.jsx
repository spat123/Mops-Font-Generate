import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PopupDialogHeader } from './PopupDialogHeader';
import { SelectableChip } from './SelectableChip';
import { EditAssetIcon } from './EditAssetIcon';
import { linkIconUrl } from './editIconUrls';
import { toast } from '../../utils/appNotify';
import { buildLibrarySharePayload } from '../../utils/librarySharePayload';
import { buildAbsoluteLibraryShareUrl } from '../../utils/libraryShareLink';
import { getLibrarySourceLabel } from '../../utils/fontLibraryUtils';

const SHARE_ICON_BTN =
  'group flex flex-col items-center gap-1.5 border-0 bg-transparent p-0 text-gray-800 transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Модалка «Общий доступ»: ссылка + соцсети, выбор шрифтов как чипы в диалоге библиотеки (SelectableChip).
 */
export function LibraryShareDialog({
  open,
  onClose,
  library,
  initialSelectedFontIds = [],
  resolveSessionFont,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set((Array.isArray(initialSelectedFontIds) ? initialSelectedFontIds : []).map(String)));
  }, [open, library?.id, initialSelectedFontIds]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const fonts = Array.isArray(library?.fonts) ? library.fonts : [];
  const selectedFonts = useMemo(
    () => fonts.filter((f) => selectedIds.has(String(f?.id || ''))),
    [fonts, selectedIds],
  );
  const unselectedFonts = useMemo(
    () => fonts.filter((f) => !selectedIds.has(String(f?.id || ''))),
    [fonts, selectedIds],
  );

  const removeTag = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
  }, []);

  const addTag = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
  }, []);

  const buildShareUrl = useCallback(async () => {
    if (!library || selectedFonts.length === 0) return '';
    const subset = { ...library, fonts: selectedFonts };
    const payload = await buildLibrarySharePayload(subset, { resolveSessionFont });
    return buildAbsoluteLibraryShareUrl(payload);
  }, [library, selectedFonts, resolveSessionFont]);

  const handleCopyLink = useCallback(async () => {
    if (selectedFonts.length === 0) {
      toast.info('Добавьте в ссылку хотя бы один шрифт');
      return;
    }
    setBusy(true);
    try {
      const url = await buildShareUrl();
      if (!url) throw new Error('empty');
      await navigator.clipboard.writeText(url);
      toast.success('Ссылка скопирована в буфер обмена');
    } catch {
      toast.error('Не удалось сформировать ссылку');
    } finally {
      setBusy(false);
    }
  }, [buildShareUrl, selectedFonts.length]);

  const shareText = useMemo(() => {
    const name = String(library?.name || 'Библиотека').trim();
    return `Шрифты: ${name}`;
  }, [library?.name]);

  const openShareTarget = useCallback(
    async (buildHref) => {
      if (selectedFonts.length === 0) {
        toast.info('Добавьте в ссылку хотя бы один шрифт');
        return;
      }
      setBusy(true);
      try {
        const url = await buildShareUrl();
        if (!url) throw new Error('empty');
        const href = buildHref(url, shareText);
        window.open(href, '_blank', 'noopener,noreferrer');
      } catch {
        toast.error('Не удалось открыть окно шаринга');
      } finally {
        setBusy(false);
      }
    },
    [buildShareUrl, selectedFonts.length, shareText],
  );

  if (!open || !library) return null;

  const portal =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            role="presentation"
            className="fixed inset-0 z-[350] flex items-center justify-center bg-black/30 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose?.();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Общий доступ: ${library.name}`}
              className="flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-none border border-gray-200 bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <PopupDialogHeader title="Общий доступ" onClose={onClose} closeAriaLabel="Закрыть" />
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleCopyLink}
                    className={SHARE_ICON_BTN}
                    aria-label="Копировать ссылку"
                  >
                    <EditAssetIcon src={linkIconUrl} className="h-6 w-6 shrink-0" />
                    <span className="max-w-[5.5rem] text-center text-[10px] font-semibold uppercase leading-tight">
                      Копировать ссылку
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={SHARE_ICON_BTN}
                    aria-label="WhatsApp"
                    onClick={() =>
                      openShareTarget((url, text) =>
                        `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
                      <circle cx="12" cy="12" r="11" fill="#25D366" />
                      <path
                        fill="#fff"
                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982 1-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                      />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase leading-tight">WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={SHARE_ICON_BTN}
                    aria-label="Telegram"
                    onClick={() =>
                      openShareTarget(
                        (url, text) =>
                          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
                      <circle cx="12" cy="12" r="11" fill="#2AABEE" />
                      <path
                        fill="#fff"
                        d="M17.2 7.7 9.5 12.4c-.5.3-.9.9-.9 1.5l-.3 2.8c0 .2.2.3.3.1l2.5-2.4c.1-.1.3-.1.4 0l4.4 3.2c.1.1.3 0 .3-.2l-1.8-8.7c0-.2-.2-.3-.3-.2z"
                      />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase leading-tight">Telegram</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={SHARE_ICON_BTN}
                    aria-label="Facebook"
                    onClick={() =>
                      openShareTarget(
                        (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
                      <circle cx="12" cy="12" r="11" fill="#1877F2" />
                      <path
                        fill="#fff"
                        d="M13.5 19v-6h2l.3-2.5H13.5V9.3c0-.7.2-1.2 1.2-1.2H16V5.7c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.7V10.5H8V13h2.4V19h3.1z"
                      />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase leading-tight">Facebook</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={SHARE_ICON_BTN}
                    aria-label="X"
                    onClick={() =>
                      openShareTarget(
                        (url, text) =>
                          `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
                      )
                    }
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-gray-900" fill="currentColor" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span className="text-[10px] font-semibold uppercase leading-tight">X</span>
                  </button>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Шрифты в ссылке
                  </div>
                  {selectedFonts.length === 0 ? (
                    <p className="mb-3 text-sm text-gray-600">
                      Пока ни одного шрифта. Нажмите чип с «+» ниже, чтобы добавить в ссылку.
                    </p>
                  ) : (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedFonts.map((font) => {
                        const id = String(font?.id || '');
                        const label = String(font?.label || id);
                        const src = getLibrarySourceLabel(font?.source);
                        return (
                          <SelectableChip
                            key={id}
                            type="button"
                            active
                            title={`${label} · ${src}`}
                            onClick={() => removeTag(id)}
                            className="max-w-full"
                          >
                            <span className="truncate">
                              {label} ×
                            </span>
                          </SelectableChip>
                        );
                      })}
                    </div>
                  )}
                  {unselectedFonts.length > 0 ? (
                    <>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Добавить</div>
                      <div className="flex flex-wrap gap-2">
                        {unselectedFonts.map((font) => {
                          const id = String(font?.id || '');
                          const label = String(font?.label || id);
                          return (
                            <SelectableChip
                              key={id}
                              type="button"
                              active={false}
                              onClick={() => addTag(id)}
                              className="max-w-full"
                            >
                              <span className="truncate">+ {label}</span>
                            </SelectableChip>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return portal;
}
