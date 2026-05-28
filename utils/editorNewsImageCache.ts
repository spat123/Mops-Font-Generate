/**
 * Предзагрузка и кэш картинок ленты «Новости / Обновления» (in-memory + HTTP cache браузера).
 */

const inflight = new Map<string, Promise<void>>();
const loaded = new Set<string>();

export type EditorNewsFeedItem = {
  imageUrl?: string;
  imageUrlEn?: string;
};

export function isEditorNewsImageCached(url: string): boolean {
  const u = String(url || '').trim();
  return Boolean(u && loaded.has(u));
}

export function prefetchEditorNewsImage(url: string): Promise<void> {
  const u = String(url || '').trim();
  if (!u || typeof window === 'undefined') return Promise.resolve();
  if (loaded.has(u)) return Promise.resolve();
  const existing = inflight.get(u);
  if (existing) return existing;

  const task = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    const finish = () => {
      loaded.add(u);
      inflight.delete(u);
      resolve();
    };
    img.onload = finish;
    img.onerror = finish;
    img.src = u;
  });

  inflight.set(u, task);
  return task;
}

export function prefetchEditorNewsFeedImages(feed?: EditorNewsFeedItem[]): Promise<void> {
  if (typeof window === 'undefined' || !Array.isArray(feed)) return Promise.resolve();
  const urls = new Set<string>();
  for (const item of feed) {
    if (item?.imageUrl) urls.add(item.imageUrl);
    if (item?.imageUrlEn) urls.add(item.imageUrlEn);
  }
  return Promise.allSettled([...urls].map((url) => prefetchEditorNewsImage(url))).then(() => undefined);
}

/** Старт предзагрузки в idle time (не блокирует первый paint). */
export function scheduleEditorNewsFeedPrefetch(feed: EditorNewsFeedItem[]): void {
  if (typeof window === 'undefined') return;
  const run = () => {
    void prefetchEditorNewsFeedImages(feed);
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 400);
  }
}
