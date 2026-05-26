import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { listGoogleCatalogDownloadStyles } from './googleFontDownloadStyles';
import { applyFontInstanceStylesToFont } from './fontInstanceStyles';

/** Начертания семейства из кэша каталога Google (ключи metadata `fonts`). */
export function resolveGoogleFontInstanceStyles(family) {
  const name = String(family || '').trim();
  if (!name) return [];
  const entry = (readGoogleFontCatalogCache() || []).find(
    (row) => String(row?.family || '').trim().toLowerCase() === name.toLowerCase(),
  );
  return entry ? listGoogleCatalogDownloadStyles(entry) : [];
}

export function applyGoogleFontInstanceStylesToFont(font, instanceStyles) {
  applyFontInstanceStylesToFont(font, instanceStyles);
}
