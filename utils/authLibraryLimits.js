/** Максимум пользовательских библиотек для Free (после входа). */
export const MAX_SAVED_LIBRARIES_PER_ACCOUNT = 3;

/** Максимум библиотек для Pro (должен совпадать с маркетингом в PlansDialog). */
export const MAX_SAVED_LIBRARIES_PRO_ACCOUNT = 21;

/** Лимит по тарифу (сессия `user.isPro`). */
export function getMaxSavedLibrariesForUser(isPro) {
  return isPro ? MAX_SAVED_LIBRARIES_PRO_ACCOUNT : MAX_SAVED_LIBRARIES_PER_ACCOUNT;
}
