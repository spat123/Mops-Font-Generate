import { normalizeLibraryText } from './fontLibraryUtils';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';
import type { SavedLibraryFontEntry, SessionFontLookup } from '../types/savedLibrary';

/** Ключи всех записей библиотек: id и `source:label`. */
export function buildLibraryFontEntryKeys(fontLibraries: SavedLibraryRecord[]): Set<string> {
  const keys = new Set<string>();
  for (const library of Array.isArray(fontLibraries) ? fontLibraries : []) {
    for (const entry of Array.isArray(library?.fonts) ? library.fonts : []) {
      const entryId = String(entry?.id || '').trim();
      const entrySource = String(entry?.source || 'editor').trim();
      const entryLabel = normalizeLibraryText(entry?.label || '').toLowerCase();
      if (entryId) keys.add(entryId);
      if (entrySource && entryLabel) keys.add(`${entrySource}:${entryLabel}`);
    }
  }
  return keys;
}

/** Индексы session-шрифтов для сопоставления с library entry. */
export function buildSessionFontLookup(fonts: SessionFontRecord[]): SessionFontLookup {
  const byLabel = new Map<string, SessionFontRecord>();
  const byLibraryEntryId = new Map<string, SessionFontRecord>();
  const bySourceLabel = new Map<string, SessionFontRecord>();

  for (const font of Array.isArray(fonts) ? fonts : []) {
    const keys = [font.displayName, font.name].filter(Boolean) as string[];
    const source = String(font?.source || '').trim();
    const originKey = String(font?.originKey || '').trim();
    for (const key of keys) {
      const normalizedKey = String(key).toLowerCase();
      byLabel.set(normalizedKey, font);
      if (source) {
        bySourceLabel.set(`${source}:${normalizedKey}`, font);
      }
    }
    if (originKey) {
      byLibraryEntryId.set(originKey, font);
    }
    if (font?.source === 'fontsource' && font?.name) {
      byLibraryEntryId.set(`fontsource:${String(font.name).trim()}`, font);
    } else if (font?.source === 'google') {
      const family = String(font.displayName || font.name || '').trim();
      if (family) {
        byLibraryEntryId.set(`google:${family}`, font);
      }
    } else if (font?.id) {
      byLibraryEntryId.set(`session:${String(font.id).trim()}`, font);
    }
  }

  return { byLabel, byLibraryEntryId, bySourceLabel };
}

export function resolveSessionFontForLibraryEntry(
  entry: Partial<Pick<SavedLibraryFontEntry, 'id' | 'label' | 'source'>> | null | undefined,
  sessionFontLookup: SessionFontLookup | null | undefined,
): SessionFontRecord | null {
  if (!entry || !sessionFontLookup) return null;
  const entryId = String(entry.id || '').trim();
  const entryLabel = String(entry.label || '').trim().toLowerCase();
  const entrySource = String(entry.source || 'editor').trim();

  const byExactEntry =
    sessionFontLookup.byLibraryEntryId.get(entryId) ||
    sessionFontLookup.bySourceLabel.get(`${entrySource}:${entryLabel}`) ||
    null;
  if (byExactEntry) return byExactEntry;

  if (entrySource === 'fontsource' || entrySource === 'google') {
    return null;
  }

  return sessionFontLookup.byLabel.get(entryLabel) || null;
}

export function isFontStoredInAnyLibrary(
  font: SessionFontRecord | null | undefined,
  libraryFontEntryKeys: Set<string> | null | undefined,
): boolean {
  if (!font || !libraryFontEntryKeys) return false;
  const label = normalizeLibraryText(font.displayName || font.name || '').toLowerCase();
  const source = String(font.source || 'editor').trim();
  const candidates: string[] = [];
  if (font?.id) candidates.push(`session:${String(font.id).trim()}`);
  if (font?.source === 'google' && label) candidates.push(`google:${label}`);
  if (font?.source === 'fontsource' && font?.name) {
    candidates.push(`fontsource:${normalizeLibraryText(font.name).toLowerCase()}`);
  }
  if (source && label) candidates.push(`${source}:${label}`);
  return candidates.some((key) => libraryFontEntryKeys.has(key));
}
