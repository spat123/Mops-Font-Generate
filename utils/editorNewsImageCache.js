/**
 * Предзагрузка и кэш картинок ленты «Новости / Обновления» (in-memory + HTTP cache браузера).
 */

/** @type {Map<string, Promise<void>>} */
const inflight = new Map();

/** @type {Set<string>} */
const loaded = new Set();

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isEditorNewsImageCached(url) {
  const u = String(url || '').trim();
  return Boolean(u && loaded.has(u));
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
export function prefetchEditorNewsImage(url) {
  const u = String(url || '').trim();
  if (!u || typeof window === 'undefined') return Promise.resolve();
  if (loaded.has(u)) return Promise.resolve();
  const existing = inflight.get(u);
  if (existing) return existing;

  const task = new Promise((resolve) => {
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

/**
 * @param {Array<{ imageUrl?: string, imageUrlEn?: string }>} [feed]
 */
export function prefetchEditorNewsFeedImages(feed) {
  if (typeof window === 'undefined' || !Array.isArray(feed)) return Promise.resolve();
  const urls = new Set();
  for (const item of feed) {
    if (item?.imageUrl) urls.add(item.imageUrl);
    if (item?.imageUrlEn) urls.add(item.imageUrlEn);
  }
  return Promise.allSettled([...urls].map((url) => prefetchEditorNewsImage(url))).then(() => undefined);
}

/**
 * Старт предзагрузки в idle time (не блокирует первый paint).
 * @param {Array<{ imageUrl?: string, imageUrlEn?: string }>} feed
 */
export function scheduleEditorNewsFeedPrefetch(feed) {
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
