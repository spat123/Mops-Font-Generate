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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

const call = (method: keyof typeof fileStore): AnyFn =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args) => (store()[method] as AnyFn)(...args);

export const isTrustedDevice = call('isTrustedDevice');
export const trustDevice = call('trustDevice');
export const touchTrustedDevice = call('touchTrustedDevice');
export const issueLoginToken = call('issueLoginToken');
export const consumeLoginToken = call('consumeLoginToken');
export const createLoginChallenge = call('createLoginChallenge');
export const verifyLoginChallenge = call('verifyLoginChallenge');
