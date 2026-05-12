import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PopupDialogHeader } from './PopupDialogHeader';
import { EditAssetIcon } from './EditAssetIcon';
import { notificationIconUrl } from './editIconUrls';
import { EDITOR_NEWS_FEED } from '../../data/editorNewsFeed';

const EDITOR_NOTIFICATIONS_SEEN_KEY = 'mfg-editor-notifications-seen';

function readNotificationsSeen() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(EDITOR_NOTIFICATIONS_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function persistNotificationsSeen() {
  try {
    window.localStorage.setItem(EDITOR_NOTIFICATIONS_SEEN_KEY, '1');
  } catch {
    /* quota / private mode */
  }
}

function NewsCard({ item }) {
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="aspect-[21/9] min-h-[7rem] w-full border-b border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100/80">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover object-center" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Изображение
          </div>
        )}
      </div>
      <div className="space-y-2 px-4 py-3">
        <time className="block text-[11px] font-medium uppercase tabular-nums text-gray-500" dateTime={item.date}>
          {item.date}
        </time>
        <h3 className="text-sm font-semibold leading-snug text-gray-900">{item.title}</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{item.body}</p>
      </div>
    </article>
  );
}

/**
 * Кнопка уведомлений в статус-баре + выезжающая справа панель на всю высоту окна.
 */
export function NewsNotificationsDock() {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    setHasUnread(EDITOR_NEWS_FEED.length > 0 && !readNotificationsSeen());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const handleOpen = () => {
    setOpen(true);
    setHasUnread(false);
    persistNotificationsSeen();
  };

  const portal =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {open ? (
              <div
                role="presentation"
                className="fixed inset-0 z-[339] bg-black/25"
                aria-hidden
                onClick={close}
              />
            ) : null}
            <div
              className={`fixed inset-y-0 right-0 z-[340] flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
                open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
              }`}
              role="dialog"
              aria-modal="true"
              aria-hidden={!open}
              onClick={(e) => e.stopPropagation()}
            >
              <PopupDialogHeader title="Уведомления" onClose={close} closeAriaLabel="Закрыть уведомления" />
              <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/40 px-4 py-4">
                <div className="space-y-4">
                  {EDITOR_NEWS_FEED.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Уведомления"
        aria-expanded={open}
        className={`relative flex h-full min-h-12 w-12 shrink-0 items-center justify-center border-l border-gray-200 px-2 text-gray-800 transition-colors hover:text-accent ${
          hasUnread ? 'overflow-hidden' : ''
        }`}
      >
        {hasUnread ? (
          <>
            <span className="pointer-events-none absolute inset-0 editor-notify-btn-fill" aria-hidden />
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
              aria-hidden
            >
              <span className="editor-notify-ripple" />
              <span className="editor-notify-ripple editor-notify-ripple--delay" />
            </span>
            <EditAssetIcon
              src={notificationIconUrl}
              className="relative z-10 h-4 w-4 text-accent editor-notify-icon"
            />
          </>
        ) : (
          <EditAssetIcon src={notificationIconUrl} className="relative z-10 h-4 w-4" />
        )}
      </button>
      {portal}
    </>
  );
}
