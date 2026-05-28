/** Максимум шрифтов в одной share-ссылке на тарифе Free. */
export const MAX_SHARE_FONTS_FREE = 5;

export function getMaxShareFontsForUser(isPro?: boolean): number {
  return isPro ? 9999 : MAX_SHARE_FONTS_FREE;
}
