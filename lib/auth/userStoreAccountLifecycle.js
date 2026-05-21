import { getRecoverableUntilIso, isAccountRecoverable } from './accountDeletion';

export function mapDeletedAtField(row) {
  if (!row) return row;
  const deletedAt = row.deleted_at ?? row.deletedAt ?? null;
  return {
    ...row,
    deletedAt: deletedAt ? new Date(deletedAt).toISOString() : null,
  };
}

export function buildDeletedRecoverableError(user) {
  const err = Object.assign(new Error('Account deleted'), { code: 'DELETED_RECOVERABLE' });
  err.email = user?.email || null;
  err.recoverableUntil = getRecoverableUntilIso(user?.deletedAt);
  return err;
}

export function assertAccountNotDeleted(user) {
  if (!user?.deletedAt) return;
  if (isAccountRecoverable(user)) throw buildDeletedRecoverableError(user);
  throw Object.assign(new Error('Account deleted'), { code: 'DELETED_EXPIRED' });
}
