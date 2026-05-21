import { isPostgresEnabled } from './db';
import * as fileStore from './userStoreFile';
import * as postgresStore from './userStorePostgres';

function store() {
  return isPostgresEnabled() ? postgresStore : fileStore;
}

export const findUserByEmail = (...args) => store().findUserByEmail(...args);
export const findUserById = (...args) => store().findUserById(...args);
export const findUserByAccount = (...args) => store().findUserByAccount(...args);
export const createCredentialsUser = (...args) => store().createCredentialsUser(...args);
export const verifyCredentialsUser = (...args) => store().verifyCredentialsUser(...args);
export const authenticateCredentialsForLogin = (...args) => store().authenticateCredentialsForLogin(...args);
export const getCredentialsVerificationStatus = (...args) => store().getCredentialsVerificationStatus(...args);
export const confirmEmailByToken = (...args) => store().confirmEmailByToken(...args);
export const confirmEmailByCode = (...args) => store().confirmEmailByCode(...args);
export const refreshVerificationToken = (...args) => store().refreshVerificationToken(...args);
export const upsertOAuthUser = (...args) => store().upsertOAuthUser(...args);
export const linkOAuthAccountToEmail = (...args) => store().linkOAuthAccountToEmail(...args);
export const softDeleteUserById = (...args) => store().softDeleteUserById(...args);
export const restoreCredentialsAccount = (...args) => store().restoreCredentialsAccount(...args);
export const issuePasswordResetForEmail = (...args) => store().issuePasswordResetForEmail(...args);
export const resetPasswordByToken = (...args) => store().resetPasswordByToken(...args);
