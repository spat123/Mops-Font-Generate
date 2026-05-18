import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PopupDialogHeader } from './PopupDialogHeader';
import { SelectableChip } from './SelectableChip';
import {
  ShareFacebookBrandIcon,
  ShareLinkChainIcon,
  ShareTelegramBrandIcon,
  ShareWhatsappBrandIcon,
  ShareXBrandIcon,
} from './ShareSocialBrandIcons';
import { toast } from '../../utils/appNotify';
import { buildLibrarySharePayload } from '../../utils/librarySharePayload';
import { buildAbsoluteLibraryShareUrl } from '../../utils/libraryShareLink';
import { getLibrarySourceLabel } from '../../utils/fontLibraryUtils';

const SHARE_ACTIONS_GRID =
  'grid w-full grid-cols-5 items-stretch gap-1.5 sm:gap-2';

const SHARE_SOCIAL_BTN =
  'group flex w-full min-w-0 flex-col items-center justify-center gap-2 border-0 bg-transparent px-0.5 py-0 text-gray-800 transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40';

const SHARE_COPY_BTN =
  'group flex w-full min-w-0 flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 px-1 py-2 text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40';

/** Иконка «копировать ссылку» (цепочка), отдельно от соц. брендов */
const SHARE_LINK_ICON = 'h-6 w-6 shrink-0 text-gray-900';

const SHARE_ICON = 'h-10 w-10 shrink-0 text-gray-900';

/**
 * Модалка «Поделиться»: копирование ссылки (плитка) + соцсети, выбор шрифтов чипами.
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
              aria-label={`Поделиться: ${library.name}`}
              className="flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-none bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <PopupDialogHeader title="Поделиться" onClose={onClose} closeAriaLabel="Закрыть" />
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className={SHARE_ACTIONS_GRID}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleCopyLink}
                    className={SHARE_COPY_BTN}
                    aria-label="Копировать ссылку"
                  >
                    <ShareLinkChainIcon className={SHARE_LINK_ICON} />
                    <span className="max-w-full text-balance text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px]">
                      Копировать ссылку
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={SHARE_SOCIAL_BTN}
                    aria-label="WhatsApp"
                    onClick={() =>
                      openShareTarget((url, text) =>
                        `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
                      )
                    }
                  >
                    <ShareWhatsappBrandIcon className={SHARE_ICON} />
                    <span className="max-w-full text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px]">
                      WhatsApp
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={SHARE_SOCIAL_BTN}
                    aria-label="Telegram"
                    onClick={() =>
                      openShareTarget(
                        (url, text) =>
                          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
                      )
                    }
                  >
                    <ShareTelegramBrandIcon className={SHARE_ICON} />
                    <span className="max-w-full text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px]">
                      Telegram
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={SHARE_SOCIAL_BTN}
                    aria-label="Facebook"
                    onClick={() =>
                      openShareTarget(
                        (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                      )
                    }
                  >
                    <ShareFacebookBrandIcon className={SHARE_ICON} />
                    <span className="max-w-full text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px]">
                      Facebook
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={SHARE_SOCIAL_BTN}
                    aria-label="X"
                    onClick={() =>
                      openShareTarget(
                        (url, text) =>
                          `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
                      )
                    }
                  >
                    <ShareXBrandIcon className={SHARE_ICON} />
                    <span className="max-w-full text-center text-[9px] font-semibold uppercase leading-tight tracking-wide sm:text-[10px]">
                      X
                    </span>
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
