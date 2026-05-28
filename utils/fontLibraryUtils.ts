import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';

export function normalizeLibraryText(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export const RECENT_LIBRARY_ENTRY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getLibrarySourceLabel(source: unknown): string {
  if (source === 'google') return 'Google';
  if (source === 'fontsource') return 'Fontsource';
  if (source === 'fontshare') return 'Fontshare';
  if (source === 'fontfabric-trial') return 'Fontfabric Trial';
  if (source === 'local') return 'Локальный';
  return 'Сессия';
}

export function isLocalLibraryFontSource(source: unknown): boolean {
  return String(source || '').trim() === 'local';
}

/** Шрифты из каталога / редактора (не загруженные с диска). */
export function isDynamicLibraryFontSource(source: unknown): boolean {
  return !isLocalLibraryFontSource(source);
}

export function getLibraryFontShortSourceLabel(source: unknown): string {
  return isLocalLibraryFontSource(source) ? 'L' : 'D';
}

export function sanitizeLibraryFont(font: unknown): SavedLibraryFontEntry | null {
  if (!font || typeof font !== 'object') return null;
  const raw = font as SavedLibraryFontEntry & { isVariable?: boolean };
  const label = normalizeLibraryText(raw.label);
  if (!label) return null;
  const sanitized: SavedLibraryFontEntry = {
    id: String(raw.id || `font:${label.toLowerCase()}`),
    label,
    source: String(raw.source || 'session'),
  };
  if (raw.source === 'fontsource' && raw.isVariable === true) {
    sanitized.isVariable = true;
  }
  const addedAt = Number(raw.addedAt);
  if (Number.isFinite(addedAt) && addedAt > 0) {
    sanitized.addedAt = addedAt;
  }
  return sanitized;
}

export function stampLibraryFontAddedNow(font: unknown): SavedLibraryFontEntry | null {
  const sanitized = sanitizeLibraryFont(font);
  if (!sanitized) return null;
  return {
    ...sanitized,
    addedAt: Date.now(),
  };
}

export function isLibraryFontRecentlyAdded(
  font: Pick<SavedLibraryFontEntry, 'addedAt'> | null | undefined,
  now = Date.now(),
): boolean {
  const addedAt = Number(font?.addedAt);
  if (!Number.isFinite(addedAt) || addedAt <= 0) return false;
  return now - addedAt < RECENT_LIBRARY_ENTRY_WINDOW_MS;
}

/** Сколько записей в библиотеке помечены как недавно добавленные. */
export function countRecentlyAddedLibraryFonts(
  fonts: SavedLibraryFontEntry[] | null | undefined,
  now = Date.now(),
): number {
  if (!Array.isArray(fonts)) return 0;
  let n = 0;
  for (const font of fonts) {
    if (isLibraryFontRecentlyAdded(font, now)) n += 1;
  }
  return n;
}

export function sanitizeLibrary(library: unknown): SavedLibraryRecord | null {
  if (!library || typeof library !== 'object') return null;
  const raw = library as SavedLibraryRecord;
  const name = normalizeLibraryText(raw.name);
  if (!name) return null;
  const fonts = (Array.isArray(raw.fonts) ? raw.fonts : [])
    .map((entry) => sanitizeLibraryFont(entry))
    .filter((entry): entry is SavedLibraryFontEntry => entry != null);
  return {
    id: String(raw.id || `library-${Date.now()}`),
    name,
    fonts,
  };
}

export function mapSessionFontsToLibraryEntries(
  sessionFonts: SessionFontRecord[] | null | undefined,
): SavedLibraryFontEntry[] {
  return (Array.isArray(sessionFonts) ? sessionFonts : []).map((font) => ({
    id: `session:${font.id || font.name || font.displayName}`,
    label: font.displayName || font.name || 'Без названия',
    source: font.source || 'session',
  }));
}

export type CreateCatalogLibraryEntryParams = {
  source: string;
  key: unknown;
  label?: unknown;
  isVariable?: boolean;
};

export function createCatalogLibraryEntry({
  source,
  key,
  label,
  isVariable = false,
}: CreateCatalogLibraryEntryParams): SavedLibraryFontEntry | null {
  const normalizedKey = normalizeLibraryText(key);
  const normalizedLabel = normalizeLibraryText(label || key);
  if (!source || !normalizedKey || !normalizedLabel) return null;
  const entry: SavedLibraryFontEntry = {
    id: `${source}:${normalizedKey}`,
    label: normalizedLabel,
    source,
  };
  if (source === 'fontsource' && isVariable) {
    entry.isVariable = true;
  }
  return entry;
}

export function mapGoogleCatalogItemsToLibraryEntries(
  items: Array<{ family?: string }> | null | undefined,
): SavedLibraryFontEntry[] {
  return (Array.isArray(items) ? items : [])
    .map((item) =>
      createCatalogLibraryEntry({
        source: 'google',
        key: item.family,
        label: item.family,
      }),
    )
    .filter((entry): entry is SavedLibraryFontEntry => entry != null);
}

export function mapFontsourceCatalogItemsToLibraryEntries(
  items: Array<{ id?: string; slug?: string; family?: string; label?: string; isVariable?: boolean }> | null | undefined,
): SavedLibraryFontEntry[] {
  return (Array.isArray(items) ? items : [])
    .map((item) =>
      createCatalogLibraryEntry({
        source: 'fontsource',
        key: item.id || item.slug,
        label: item.family || item.label || item.id || item.slug,
        isVariable: Boolean(item?.isVariable),
      }),
    )
    .filter((entry): entry is SavedLibraryFontEntry => entry != null);
}

/** Ключи для сопоставления сессионного шрифта с `id` записей в библиотеках. */
export function getSessionFontLibraryEntryMatchKeys(font: SessionFontRecord | null | undefined): string[] {
  const keys: string[] = [];
  const add = (k: unknown) => {
    const s = String(k || '').trim();
    if (s) keys.push(s);
  };
  add(font?.originKey);
  if (font?.id != null) add(`session:${String(font.id).trim()}`);
  const source = String(font?.source || '').trim();
  const rawDisplay = String(font?.displayName || '').trim();
  const rawName = String(font?.name || '').trim();
  if (source === 'google') {
    const parts = [...new Set([rawDisplay, rawName].filter(Boolean))];
    for (const p of parts) {
      add(`google:${p}`);
      add(`google:${normalizeLibraryText(p)}`);
    }
  }
  if (source === 'fontsource' && rawName) {
    add(`fontsource:${rawName}`);
    add(`fontsource:${normalizeLibraryText(rawName)}`);
  }
  if (source === 'local' && font?.id != null) {
    add(`local:${String(font.id).trim()}`);
  }
  return [...new Set(keys)];
}

/**
 * Шрифты сессии, соответствующие записям удаляемой библиотеки и не остающиеся ни в одной другой библиотеке.
 */
export function getFontIdsToRemoveWhenLibraryDeleted(
  fonts: SessionFontRecord[] | null | undefined,
  deletedLibrary: SavedLibraryRecord | null | undefined,
  remainingLibraries: SavedLibraryRecord[] | null | undefined,
): string[] {
  const deletedEntryIds = new Set(
    (Array.isArray(deletedLibrary?.fonts) ? deletedLibrary.fonts : [])
      .map((e) => String(e?.id || '').trim())
      .filter(Boolean),
  );
  if (deletedEntryIds.size === 0) return [];

  const otherEntryIds = new Set(
    (Array.isArray(remainingLibraries) ? remainingLibraries : []).flatMap((lib) =>
      (Array.isArray(lib?.fonts) ? lib.fonts : []).map((e) => String(e?.id || '').trim()).filter(Boolean),
    ),
  );

  const out: string[] = [];
  for (const font of fonts || []) {
    const keys = getSessionFontLibraryEntryMatchKeys(font);
    const hitsDeleted = keys.some((k) => deletedEntryIds.has(k));
    const staysInOther = keys.some((k) => otherEntryIds.has(k));
    if (hitsDeleted && !staysInOther && font.id) out.push(font.id);
  }
  return out;
}

export function isGoogleFontInSession(fonts: SessionFontRecord[] | null | undefined, family: string): boolean {
  return (Array.isArray(fonts) ? fonts : []).some(
    (font) =>
      font?.source === 'google' &&
      (font.originalName === `${family}.woff2` ||
        font.name === family ||
        font.displayName === family),
  );
}

export function isFontsourceFontInSession(fonts: SessionFontRecord[] | null | undefined, slug: string): boolean {
  return (Array.isArray(fonts) ? fonts : []).some(
    (font) => font?.source === 'fontsource' && font.name === slug,
  );
}

export function isFontshareFontInSession(fonts: SessionFontRecord[] | null | undefined, slug: string): boolean {
  const key = String(slug || '').trim();
  if (!key) return false;
  return (Array.isArray(fonts) ? fonts : []).some(
    (font) =>
      font?.source === 'fontshare' &&
      (font.name === key || font.originKey === `fontshare:${key}`),
  );
}

export function mergeLibraryEntries(
  ...groups: Array<SavedLibraryFontEntry[] | null | undefined>
): SavedLibraryFontEntry[] {
  const merged = new Map<string, SavedLibraryFontEntry>();
  groups.flat().forEach((item) => {
    if (!item?.label) return;
    const key = item.label.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, item);
    }
  });
  return Array.from(merged.values()).sort((a, b) =>
    (a.label || '').localeCompare(b.label || '', 'ru', { sensitivity: 'base' }),
  );
}
