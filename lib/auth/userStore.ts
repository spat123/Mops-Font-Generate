import { isPostgresEnabled } from './db';
import * as fileStore from './userStoreFile';
import * as postgresStore from './userStorePostgres';

function store() {
  return isPostgresEnabled() ? postgresStore : fileStore;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const call = (method: keyof typeof fileStore): AnyFn =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args) => (store()[method] as AnyFn)(...args);

export const findUserByEmail = call('findUserByEmail');
export const findUserById = call('findUserById');
export const findUserByAccount = call('findUserByAccount');
export const createCredentialsUser = call('createCredentialsUser');
export const verifyCredentialsUser = call('verifyCredentialsUser');
export const authenticateCredentialsForLogin = call('authenticateCredentialsForLogin');
export const getCredentialsVerificationStatus = call('getCredentialsVerificationStatus');
export const confirmEmailByToken = call('confirmEmailByToken');
export const confirmEmailByCode = call('confirmEmailByCode');
export const refreshVerificationToken = call('refreshVerificationToken');
export const upsertOAuthUser = call('upsertOAuthUser');
export const linkOAuthAccountToEmail = call('linkOAuthAccountToEmail');
export const softDeleteUserById = call('softDeleteUserById');
export const restoreCredentialsAccount = call('restoreCredentialsAccount');
export const issuePasswordResetForEmail = call('issuePasswordResetForEmail');
export const resetPasswordByToken = call('resetPasswordByToken');
