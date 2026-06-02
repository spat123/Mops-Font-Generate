import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PopupDialogHeader } from './PopupDialogHeader';
import { SegmentedControl } from './SegmentedControl';
import { EditAssetIcon } from './EditAssetIcon';
import { notificationIconUrl } from './editIconUrls';
import { BugReportDialog } from './BugReportDialog';
import {
  EDITOR_NEWS_FEED,
  getEditorFeedByKind,
  formatEditorNewsDate,
  getLatestUpdateId,
} from '../../data/editorNewsFeed';
import {
  isEditorNewsImageCached,
  prefetchEditorNewsFeedImages,
  prefetchEditorNewsImage,
  scheduleEditorNewsFeedPrefetch,
} from '../../utils/editorNewsImageCache';

const EDITOR_NOTIFICATIONS_SEEN_KEY = 'mfg-editor-notifications-seen';
const EDITOR_UPDATES_LAST_SEEN_ID_KEY = 'mfg-editor-updates-last-seen-id';

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

function readUpdatesLastSeenId() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(EDITOR_UPDATES_LAST_SEEN_ID_KEY);
  } catch {
    return null;
  }
}

function persistUpdatesLastSeenId(id: string | null | undefined) {
  if (!id) return;
  try {
    window.localStorage.setItem(EDITOR_UPDATES_LAST_SEEN_ID_KEY, String(id));
  } catch {
    /* quota / private mode */
  }
}

function computeHasUnreadUpdates() {
  const latestId = getLatestUpdateId();
  if (!latestId) return false;
  return readUpdatesLastSeenId() !== latestId;
}

type EditorNewsKind = 'news' | 'updates';

type EditorNewsItem = {
  id: string;
  kind: string;
  imageUrl?: string;
  date?: string;
  title?: string;
  body?: string;
};

function UpdatesTabLabel({ showDot }: { showDot: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      Обновления
      {showDot ? <span className="editor-notify-tab-dot" aria-hidden /> : null}
    </span>
  );
}

function NewsCard({ item, eagerImage }: { item: EditorNewsItem; eagerImage?: boolean }) {
  const imagePlaceholder =
    item.kind === 'updates' ? 'Превью обновления' : 'Изображение';
  const imageUrl = item.imageUrl ? String(item.imageUrl) : '';
  const [imageReady, setImageReady] = useState(
    () => !imageUrl || isEditorNewsImageCached(imageUrl),
  );

  useEffect(() => {
    if (!imageUrl) {
      setImageReady(false);
      return undefined;
    }
    if (isEditorNewsImageCached(imageUrl)) {
      setImageReady(true);
      return undefined;
    }
    let cancelled = false;
    void prefetchEditorNewsImage(imageUrl).then(() => {
      if (!cancelled) setImageReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return (
    <article className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="relative aspect-[21/9] min-h-[7rem] w-full overflow-hidden border-b border-gray-100 bg-gray-50">
        {imageUrl ? (
          <>
            {!imageReady ? (
              <div
                className="absolute inset-0 animate-pulse bg-gray-100"
                aria-hidden
              />
            ) : null}
            <img
              src={imageUrl}
              alt={item.title ? String(item.title) : ''}
              className={`h-full w-full object-cover object-center transition-opacity duration-200 ${
                imageReady ? 'opacity-100' : 'opacity-0'
              }`}
              loading={eagerImage ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={eagerImage ? 'high' : 'auto'}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">{imagePlaceholder}</div>
        )}
      </div>
      <div className="space-y-2 px-4 py-3">
        <h3 className="flex items-baseline justify-between gap-2 text-sm uppercase font-semibold leading-snug text-gray-900">
          <span className="min-w-0">{item.title}</span>
          {item.date ? (
            <time
              className="shrink-0 text-sm font-normal uppercase tabular-nums text-gray-500"
              dateTime={item.date}
            >
              {formatEditorNewsDate(item.date)}
            </time>
          ) : null}
        </h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">{item.body}</p>
      </div>
    </article>
  );
}

function NotificationsEmpty({ kind }: { kind: EditorNewsKind }) {
  const label = kind === 'updates' ? 'обновлений' : 'новостей';
  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
      <p className="text-sm font-medium text-gray-700">Пока нет {label}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        Здесь появятся {kind === 'updates' ? 'заметки о релизах и изменениях' : 'анонсы и новости продукта'}.
      </p>
    </div>
  );
}

/**
 * Кнопка уведомлений в статус-баре + выезжающая справа панель на всю высоту окна.
 */
export function NewsNotificationsDock() {
  const [open, setOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [hasUnreadUpdates, setHasUnreadUpdates] = useState(false);
  const [activeKind, setActiveKind] = useState<EditorNewsKind>('news');
  /** После первого открытия панели держим обе вкладки в DOM — картинки не перезагружаются при переключении. */
  const [panelContentMounted, setPanelContentMounted] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const newsFeed = useMemo(() => getEditorFeedByKind('news'), []);
  const updatesFeed = useMemo(() => getEditorFeedByKind('updates'), []);

  const kindOptions = useMemo(
    () => [
      { value: 'news', label: 'Новости', title: 'Новости продукта' },
      {
        value: 'updates',
        label: <UpdatesTabLabel showDot={hasUnreadUpdates} />,
        title: 'Обновления редактора',
      },
    ],
    [hasUnreadUpdates],
  );

  const markUpdatesSeen = useCallback(() => {
    const latestId = getLatestUpdateId();
    if (!latestId) return;
    persistUpdatesLastSeenId(latestId);
    setHasUnreadUpdates(false);
  }, []);

  const handleKindChange = useCallback(
    (kind: EditorNewsKind) => {
      setActiveKind(kind);
      if (kind === 'updates') markUpdatesSeen();
    },
    [markUpdatesSeen],
  );

  useLayoutEffect(() => {
    setHasUnreadUpdates(computeHasUnreadUpdates());
    setHasUnread(
      (EDITOR_NEWS_FEED.length > 0 && !readNotificationsSeen()) || computeHasUnreadUpdates(),
    );
    scheduleEditorNewsFeedPrefetch(EDITOR_NEWS_FEED);
  }, []);

  useEffect(() => {
    if (!open) return;
    setPanelContentMounted(true);
    void prefetchEditorNewsFeedImages(EDITOR_NEWS_FEED);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
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

  useEffect(() => {
    if (open && activeKind === 'updates') markUpdatesSeen();
  }, [open, activeKind, markUpdatesSeen]);

  const handleOpen = () => {
    setPanelContentMounted(true);
    setOpen(true);
    setHasUnread(false);
    persistNotificationsSeen();
    void prefetchEditorNewsFeedImages(EDITOR_NEWS_FEED);
    if (activeKind === 'updates') markUpdatesSeen();
  };

  const showNotifyPulse = hasUnread || hasUnreadUpdates;

  const portal =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {open ? (
              <div
                role="presentation"
                className="fixed inset-0 z-[339] bg-black/30"
                aria-hidden
                onClick={close}
              />
            ) : null}
            <div
              className={`fixed inset-y-0 right-0 z-[340] flex w-full max-w-md flex-col border-l border-gray-200 bg-white transition-transform duration-300 ease-out ${
                open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
              }`}
              role="dialog"
              aria-modal="true"
              aria-hidden={!open}
              onClick={(e) => e.stopPropagation()}
            >
              <PopupDialogHeader
                title="Уведомления"
                onClose={close}
                closeAriaLabel="Закрыть уведомления"
              />

              <div className="shrink-0 border-b border-gray-200 px-4 py-3">
                <SegmentedControl
                  value={activeKind}
                  onChange={handleKindChange}
                  options={kindOptions}
                  variant="surface"
                  label="Тип уведомлений"
                  className="w-full"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {panelContentMounted ? (
                  <>
                    <div
                      className={activeKind === 'news' ? 'space-y-4' : 'hidden'}
                      aria-hidden={activeKind !== 'news'}
                    >
                      {newsFeed.length > 0 ? (
                        newsFeed.map((item) => (
                          <NewsCard key={item.id} item={item} eagerImage />
                        ))
                      ) : (
                        <NotificationsEmpty kind="news" />
                      )}
                    </div>
                    <div
                      className={activeKind === 'updates' ? 'space-y-4' : 'hidden'}
                      aria-hidden={activeKind !== 'updates'}
                    >
                      {updatesFeed.length > 0 ? (
                        updatesFeed.map((item) => (
                          <NewsCard key={item.id} item={item} eagerImage />
                        ))
                      ) : (
                        <NotificationsEmpty kind="updates" />
                      )}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="shrink-0 border-t border-gray-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => setBugReportOpen(true)}
                  className="flex w-full items-center justify-center rounded-md border border-gray-50 bg-gray-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-tight text-gray-900 transition-colors hover:border-accent hover:bg-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                >
                  Сообщить об ошибке
                </button>
                <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-500">
                  Опишите проблему, и мы получим письмо с контекстом страницы.
                </p>
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
        className={`relative flex h-full min-h-12 w-12 shrink-0 cursor-pointer items-center justify-center border-l border-gray-200 px-2 text-gray-800 transition-colors hover:text-accent ${
          showNotifyPulse ? 'overflow-hidden' : ''
        }`}
      >
        {showNotifyPulse ? (
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
      <BugReportDialog open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </>
  );
}
