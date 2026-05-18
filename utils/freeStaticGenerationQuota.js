/** Лимит генераций статического файла из VF на тарифе Free (клиент, localStorage). */
export const FREE_STATIC_GENERATIONS_LIMIT = 50;

const STORAGE_PREFIX = 'dinamic-font:free-static-generations-used:';

/** @param {string | null | undefined} userId */
export function freeStaticGenerationsStorageKey(userId) {
  const id = String(userId || '').trim();
  return id ? `${STORAGE_PREFIX}${id}` : null;
}

/** @param {string | null | undefined} userId */
export function readFreeStaticGenerationsUsed(userId) {
  const key = freeStaticGenerationsStorageKey(userId);
  if (!key || typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(key);
    const n = Number.parseInt(String(raw ?? ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** @param {string | null | undefined} userId @param {number} value */
export function writeFreeStaticGenerationsUsed(userId, value) {
  const key = freeStaticGenerationsStorageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(Math.max(0, Math.floor(Number(value) || 0))));
  } catch {
    /* ignore */
  }
}
