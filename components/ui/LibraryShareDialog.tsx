import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { SavedLibraryRecord, SessionFontRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';
import { createPortal } from 'react-dom';
import { PopupDialogHeader } from './PopupDialogHeader';
import { SelectableChip } from './SelectableChip';
import { Tooltip } from './Tooltip';
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
import { useLibraryAuth } from '../../contexts/LibraryAuthContext';
import { getMaxShareFontsForUser, MAX_SHARE_FONTS_FREE } from '../../utils/libraryShareLimits';

const SHARE_ACTIONS_GRID =
  'grid w-full grid-cols-5 items-stretch gap-1.5 sm:gap-2';

const SHARE_SOCIAL_BTN =
  'group flex w-full min-w-0 flex-col items-center justify-center gap-3 border-0 bg-transparent px-0.5 py-0 text-gray-800 transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-40';

const SHARE_COPY_BTN =
  'group flex w-full min-w-0 flex-col items-center justify-center gap-3 rounded-lg bg-gray-50 px-1 py-2 text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40';

/** Иконка «копировать ссылку» (цепочка), отдельно от соц. брендов */
const SHARE_LINK_ICON = 'h-6 w-6 shrink-0 text-gray-900';

const SHARE_ICON = 'h-10 w-10 shrink-0 text-gray-900';

/**
 * Модалка «Поделиться»: копирование ссылки (плитка) + соцсети, выбор шрифтов чипами.
 */
export type LibraryShareDialogProps = {
  open: boolean;
  onClose?: () => void;
  library: SavedLibraryRecord | null;
  initialSelectedFontIds?: string[];
  resolveSessionFont?: (fontEntry: SavedLibraryFontEntry) => SessionFontRecord | null | undefined;
};

export function LibraryShareDialog({
  open,
  onClose,
  library,
  initialSelectedFontIds = [],
  resolveSessionFont,
}: LibraryShareDialogProps) {
  const { isPro } = useLibraryAuth();
  const maxShareFonts = getMaxShareFontsForUser(isPro);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let ids = (Array.isArray(initialSelectedFontIds) ? initialSelectedFontIds : []).map(String);
    if (!isPro && ids.length > maxShareFonts) {
      ids = ids.slice(0, maxShareFonts);
    }
    setSelectedIds(new Set(ids));
  }, [open, library?.id, initialSelectedFontIds, isPro, maxShareFonts]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
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
  const shareLimitFull = !isPro && selectedIds.size >= maxShareFonts;

  const removeTag = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
  }, []);

  const addTag = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (!isPro && prev.size >= maxShareFonts) {
          return prev;
        }
        const next = new Set(prev);
        next.add(String(id));
        return next;
      });
    },
    [isPro, maxShareFonts],
  );

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
    async (buildHref: (url: string, text: string) => string) => {
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
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Шрифты в ссылке
                    </span>
                    {!isPro ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold tabular-nums text-gray-600">
                          {selectedFonts.length}/{MAX_SHARE_FONTS_FREE}
                        </span>
                        <Tooltip
                          content="На Free в одной ссылке — до 5 шрифтов. В Pro — без ограничения."
                          openDelayMs={200}
                          side="bottom"
                        >
                          <button
                            type="button"
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[10px] font-bold italic leading-none text-gray-700"
                            aria-label="Лимит шрифтов в ссылке"
                          >
                            i
                          </button>
                        </Tooltip>
                      </span>
                    ) : null}
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
                          const chipDisabled = shareLimitFull;
                          const chip = (
                            <SelectableChip
                              type="button"
                              active={false}
                              disabled={chipDisabled}
                              onClick={() => addTag(id)}
                              className="max-w-full"
                            >
                              <span className="truncate">+ {label}</span>
                            </SelectableChip>
                          );
                          return chipDisabled ? (
                            <Tooltip
                              key={id}
                              content={`На Free в ссылке — не больше ${MAX_SHARE_FONTS_FREE} шрифтов`}
                              openDelayMs={200}
                              side="top"
                            >
                              <span className="inline-flex max-w-full">{chip}</span>
                            </Tooltip>
                          ) : (
                            <Fragment key={id}>{chip}</Fragment>
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
