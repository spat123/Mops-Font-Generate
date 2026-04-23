/**
 * Единый slug для Fontsource-пакетов, имён файлов и CSS-классов: trim, lower, пробелы → дефис.
 */
export function slugifyFontKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/** Для имён файлов: slug + удаление символов вне [a-z0-9-]. */
export function slugifyFontFilenameStub(value) {
  return slugifyFontKey(value).replace(/[^a-z0-9-]/g, '');
}

/**
 * Человекочитаемое имя из kebab-case (как в npm @fontsource/foo-bar).
 */
export function titleCaseFromKebabSlug(slug) {
  return String(slug || '')
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
