/** Срок, в течение которого удалённый аккаунт можно восстановить. */
export const ACCOUNT_RECOVERY_MS = 180 * 24 * 60 * 60 * 1000;

export function parseDeletedAt(value) {
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

export function isAccountDeleted(user) {
  return Boolean(parseDeletedAt(user?.deletedAt));
}

export function getAccountRecoveryDeadlineMs(deletedAt) {
  const deletedMs = parseDeletedAt(deletedAt);
  if (!deletedMs) return null;
  return deletedMs + ACCOUNT_RECOVERY_MS;
}

export function isAccountRecoverable(user) {
  const deadline = getAccountRecoveryDeadlineMs(user?.deletedAt);
  if (!deadline) return false;
  return Date.now() < deadline;
}

export function getRecoverableUntilIso(deletedAt) {
  const deadline = getAccountRecoveryDeadlineMs(deletedAt);
  return deadline ? new Date(deadline).toISOString() : null;
}

export function formatRecoveryDeadlineRu(isoOrMs) {
  const ms = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(String(isoOrMs || ''));
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
