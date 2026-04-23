/** Сортировка записей каталога по полю `family` (как в API и панелях). */
export function compareFontFamilyName(a, b) {
  return String(a?.family ?? '').localeCompare(String(b?.family ?? ''), 'ru', { sensitivity: 'base' });
}
