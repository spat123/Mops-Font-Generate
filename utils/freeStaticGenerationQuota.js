/** Лимит генераций VF → статик без входа (в месяц). */
export const GUEST_STATIC_GENERATIONS_LIMIT = 3;

/** Лимит генераций VF → статик на тарифе Free после входа (в месяц). */
export const FREE_STATIC_GENERATIONS_LIMIT = 50;

const STORAGE_PREFIX = 'dinamic-font:free-static-generations-used:';
const GUEST_STORAGE_KEY = 'dinamic-font:guest-static-generations-used';
const GUEST_QUOTA_ID_KEY = 'dinamic-font:guest-quota-id';

/** @returns {string} YYYY-MM в локальной TZ */
export function getCurrentQuotaPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** @param {string | null | undefined} userId */
export function freeStaticGenerationsStorageKey(userId) {
  const id = String(userId || '').trim();
  return id ? `${STORAGE_PREFIX}${id}` : GUEST_STORAGE_KEY;
}

/** @param {string | null | undefined} userId */
export function getStaticGenerationsLimit(userId) {
  return String(userId || '').trim() ? FREE_STATIC_GENERATIONS_LIMIT : GUEST_STATIC_GENERATIONS_LIMIT;
}

function parseStoredUsage(raw) {
  if (raw == null || raw === '') return { period: getCurrentQuotaPeriod(), used: 0 };
  try {
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      const period = String(parsed?.period || '').trim() || getCurrentQuotaPeriod();
      const used = Number.parseInt(String(parsed?.used ?? ''), 10);
      return {
        period,
        used: Number.isFinite(used) && used >= 0 ? used : 0,
      };
    }
    const legacy = Number.parseInt(String(raw), 10);
    return {
      period: getCurrentQuotaPeriod(),
      used: Number.isFinite(legacy) && legacy >= 0 ? legacy : 0,
    };
  } catch {
    return { period: getCurrentQuotaPeriod(), used: 0 };
  }
}

function serializeUsage({ period, used }) {
  return JSON.stringify({
    period: period || getCurrentQuotaPeriod(),
    used: Math.max(0, Math.floor(Number(used) || 0)),
  });
}

/** @param {string | null | undefined} userId */
export function readFreeStaticGenerationsUsed(userId) {
  const key = freeStaticGenerationsStorageKey(userId);
  if (!key || typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(key);
    const { period, used } = parseStoredUsage(raw);
    if (period !== getCurrentQuotaPeriod()) return 0;
    return used;
  } catch {
    return 0;
  }
}

/** @param {string | null | undefined} userId @param {number} value */
export function writeFreeStaticGenerationsUsed(userId, value) {
  const key = freeStaticGenerationsStorageKey(userId);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      key,
      serializeUsage({ period: getCurrentQuotaPeriod(), used: value }),
    );
  } catch {
    /* ignore */
  }
}

/** Стабильный id гостя для серверного учёта (не сбрасывается при смене месяца). */
export function getOrCreateGuestQuotaId() {
  if (typeof window === 'undefined') return '';
  try {
    const existing = String(window.localStorage.getItem(GUEST_QUOTA_ID_KEY) || '').trim();
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `g-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    window.localStorage.setItem(GUEST_QUOTA_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
}

function pluralGenerations(n) {
  const abs = Math.abs(Math.floor(Number(n) || 0));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'генераций';
  if (mod10 === 1) return 'генерация';
  if (mod10 >= 2 && mod10 <= 4) return 'генерации';
  return 'генераций';
}

/** @param {boolean} isAuthenticated @param {number} remaining @param {number} [limit] */
export function getStaticGenerationsAvailabilityMessage(isAuthenticated, remaining, limit) {
  const lim = Math.max(
    0,
    Math.floor(
      Number(limit) ||
        (isAuthenticated ? FREE_STATIC_GENERATIONS_LIMIT : GUEST_STATIC_GENERATIONS_LIMIT),
    ),
  );
  const rem = Math.max(0, Math.floor(Number(remaining) || 0));

  if (rem <= 0) {
    return isAuthenticated
      ? 'Вы исчерпали лимит генераций в этом месяце.'
      : 'Вы исчерпали лимит генераций.';
  }

  return `Вам доступно ${rem}/${lim} бесплатных ${pluralGenerations(lim)} в месяц.`;
}
