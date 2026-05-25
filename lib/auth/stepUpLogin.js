import { isPostgresEnabled } from './db';
import * as fileStore from './stepUpLoginFile';
import * as postgresStore from './stepUpLoginPostgres';

function store() {
  return isPostgresEnabled() ? postgresStore : fileStore;
}

export function isStepUpLoginAvailable() {
  if (isPostgresEnabled()) return true;
  // Без Postgres loginToken в файле контейнера — на Timeweb (несколько pod) signIn не найдёт токен.
  if (process.env.NODE_ENV === 'production') return false;
  return !process.env.VERCEL;
}

export function isStepUpLoginDisabled() {
  return String(process.env.LOGIN_STEP_UP_DISABLED || '').trim() === '1';
}

export const isTrustedDevice = (...args) => store().isTrustedDevice(...args);
export const trustDevice = (...args) => store().trustDevice(...args);
export const touchTrustedDevice = (...args) => store().touchTrustedDevice(...args);
export const issueLoginToken = (...args) => store().issueLoginToken(...args);
export const consumeLoginToken = (...args) => store().consumeLoginToken(...args);
export const createLoginChallenge = (...args) => store().createLoginChallenge(...args);
export const verifyLoginChallenge = (...args) => store().verifyLoginChallenge(...args);
