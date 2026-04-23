import { slugifyFontKey } from './fontSlug';

function rowDedupeKey(row, source) {
  const raw =
    source === 'google'
      ? row?.family
      : row?.family || row?.id || row?.slug;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return slugifyFontKey(raw);
}

/**
 * Сводка по двум каталогам: сколько строк в каждом и сколько уникальных семейств
 * по нормализованному ключу (как для Fontsource slug / имени Google).
 */
export function getCatalogUnionStats(googleItems, fontsourceItems) {
  const g = Array.isArray(googleItems) ? googleItems : [];
  const f = Array.isArray(fontsourceItems) ? fontsourceItems : [];
  const googleKeys = new Set();
  for (const row of g) {
    const k = rowDedupeKey(row, 'google');
    if (k) googleKeys.add(k);
  }
  const fontsourceKeys = new Set();
  for (const row of f) {
    const k = rowDedupeKey(row, 'fontsource');
    if (k) fontsourceKeys.add(k);
  }
  const keys = new Set([...googleKeys, ...fontsourceKeys]);
  const googleTotal = g.length;
  const fontsourceTotal = f.length;
  const googleUniqueFamilies = googleKeys.size;
  const fontsourceUniqueFamilies = fontsourceKeys.size;
  const uniqueFamilies = keys.size;
  const overlapCount = Math.max(0, googleTotal + fontsourceTotal - uniqueFamilies);
  return {
    googleTotal,
    fontsourceTotal,
    googleUniqueFamilies,
    fontsourceUniqueFamilies,
    uniqueFamilies,
    overlapCount,
  };
}

/**
 * Строка для статус-бара: сколько шрифтов в выбранном каталоге (уникальные ключи внутри источника).
 * @param {'google' | 'fontsource'} catalogSource
 */
export function formatCatalogAvailabilityShort(s, catalogSource = 'google') {
  if (!s) {
    return 'Каталоги ещё не загружены';
  }
  const isFontsource = catalogSource === 'fontsource';
  const total = isFontsource ? s.fontsourceTotal : s.googleTotal;
  if (total === 0) {
    return 'Каталоги ещё не загружены';
  }
  const n = isFontsource ? s.fontsourceUniqueFamilies : s.googleUniqueFamilies;
  return isFontsource ? `Шрифтов Fontsource: ${n} шт.` : `Шрифтов Google: ${n} шт.`;
}

/** Объединение каталогов (пустая вкладка редактора): уникальные семейства Google ∪ Fontsource. */
export function formatCatalogUnionAvailabilityShort(s) {
  if (!s || (s.googleTotal === 0 && s.fontsourceTotal === 0)) {
    return 'Каталоги ещё не загружены';
  }
  return `Доступно в редакторе: ${s.uniqueFamilies} шт.`;
}
