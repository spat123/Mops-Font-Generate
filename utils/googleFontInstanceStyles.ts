import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { listGoogleCatalogDownloadStyles } from './googleFontDownloadStyles';
import { applyFontInstanceStylesToFont, type FontInstanceStyle } from './fontInstanceStyles';
import type { SessionFontRecord } from '../types/editorFonts';

/** Начертания семейства из кэша каталога Google (ключи metadata `fonts`). */
export function resolveGoogleFontInstanceStyles(family: unknown): FontInstanceStyle[] {
  const name = String(family || '').trim();
  if (!name) return [];
  const entry = (readGoogleFontCatalogCache() || []).find(
    (row) => String(row?.family || '').trim().toLowerCase() === name.toLowerCase(),
  );
  return entry
    ? listGoogleCatalogDownloadStyles(entry as { downloadStyles?: Array<Record<string, unknown>> })
    : [];
}

export function applyGoogleFontInstanceStylesToFont(
  font: SessionFontRecord,
  instanceStyles: FontInstanceStyle[] | null | undefined,
): void {
  applyFontInstanceStylesToFont(font, instanceStyles);
}
