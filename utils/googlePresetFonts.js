/** Имена семейств для превью и пакетной загрузки через /api/google-font */
export const GOOGLE_PRESET_FONT_NAMES = ['Roboto', 'Inter', 'Open Sans', 'Lato'];

/**
 * Какие пресеты ещё не добавлены в сессию (по source и originalName *.woff2).
 */
export function getMissingGooglePresetFamilies(fonts) {
  const loaded = new Set();
  for (const f of fonts) {
    if (f.source !== 'google' || typeof f.originalName !== 'string') continue;
    const m = f.originalName.match(/^(.+)\.woff2$/i);
    if (m) loaded.add(m[1]);
  }
  return GOOGLE_PRESET_FONT_NAMES.filter((name) => !loaded.has(name));
}
