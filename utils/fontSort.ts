function familySortKey(value: string | { family?: string } | null | undefined): string {
  if (typeof value === 'string') return value;
  return String(value?.family ?? '');
}

/** Сортировка записей каталога по полю `family` (как в API и панелях). */
export function compareFontFamilyName(
  a: string | { family?: string } | null | undefined,
  b: string | { family?: string } | null | undefined,
): number {
  return familySortKey(a).localeCompare(familySortKey(b), 'ru', { sensitivity: 'base' });
}
