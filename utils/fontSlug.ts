/**
 * Единый slug для Fontsource-пакетов, имён файлов и CSS-классов: trim, lower, пробелы → дефис.
 */
export function slugifyFontKey(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/** Для имён файлов: slug + удаление символов вне [a-z0-9-]. */
export function slugifyFontFilenameStub(value: unknown): string {
  return slugifyFontKey(value).replace(/[^a-z0-9-]/g, '');
}

/**
 * Человекочитаемое имя из kebab-case (как в npm @fontsource/foo-bar).
 */
export function titleCaseFromKebabSlug(slug: unknown): string {
  return String(slug || '')
    .split('-')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

const KEBAB_FONT_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Человекочитаемое имя, если в метаданных пришёл npm-slug (roboto-condensed). */
export function humanizeFontsourceFamilyLabel(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  if (KEBAB_FONT_SLUG_RE.test(raw)) return titleCaseFromKebabSlug(raw);
  return raw;
}

/** Подпись шрифта в UI (статус-бар, тосты): displayName, не технический slug. */
export function resolveSessionFontDisplayLabel(font: {
  displayName?: string | null;
  fontFamily?: string | null;
  name?: string | null;
} | null | undefined): string {
  if (!font) return 'Шрифт';
  // `fontFamily` часто технический (`font-abc123`) — показываем его только если нет нормального имени.
  const raw = String(font.displayName || font.name || font.fontFamily || 'Шрифт')
    .replace(/-static$/i, '')
    .replace(/\s+variable$/i, '')
    .trim();
  if (!raw) return 'Шрифт';
  return humanizeFontsourceFamilyLabel(raw) || 'Шрифт';
}
