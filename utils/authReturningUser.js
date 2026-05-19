/** Клиентский флаг: пользователь хотя бы раз успешно входил в аккаунт. */
export const AUTH_HAS_SIGNED_IN_LS_KEY = 'authHasSignedInBefore';

export function hasSignedInBefore() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(AUTH_HAS_SIGNED_IN_LS_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHasSignedInBefore() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AUTH_HAS_SIGNED_IN_LS_KEY, '1');
  } catch {
    // quota / private mode
  }
}
