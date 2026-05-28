import { getRecoverableUntilIso, isAccountRecoverable } from './accountDeletion';

export function mapDeletedAtField(row) {
  if (!row) return row;
  const deletedAt = row.deleted_at ?? row.deletedAt ?? null;
  return {
    ...row,
    deletedAt: deletedAt ? new Date(deletedAt).toISOString() : null,
  };
}

export function buildDeletedRecoverableError(user: { email?: string; deletedAt?: string | null }) {
  return Object.assign(new Error('Account deleted'), {
    code: 'DELETED_RECOVERABLE',
    email: user?.email || null,
    recoverableUntil: getRecoverableUntilIso(user?.deletedAt),
  });
}

export function assertAccountNotDeleted(user) {
  if (!user?.deletedAt) return;
  if (isAccountRecoverable(user)) throw buildDeletedRecoverableError(user);
  throw Object.assign(new Error('Account deleted'), { code: 'DELETED_EXPIRED' });
}
