/** Максимум шрифтов в одной share-ссылке на тарифе Free. */
export const MAX_SHARE_FONTS_FREE = 5;

/** @param {boolean} [isPro] */
export function getMaxShareFontsForUser(isPro) {
  return isPro ? 9999 : MAX_SHARE_FONTS_FREE;
}
