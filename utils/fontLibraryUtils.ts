import type { Dispatch, SetStateAction } from 'react';
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

/** Внешний каталог: только «Скачать с источника», без открытия в редакторе. */
export function isExternalLibraryFontSource(source: unknown): boolean {
  const normalized = String(source || '').trim();
  return normalized === 'fontshare' || normalized === 'fontfabric-trial';
}

export function savedLibraryFontCanOpenInEditor(
  font: Pick<SavedLibraryFontEntry, 'source'> | null | undefined,
  sessionFont: SessionFontRecord | null | undefined = null,
): boolean {
  if (sessionFont) return true;
  const source = String(font?.source || '').trim();
  if (isExternalLibraryFontSource(source)) return false;
  return source === 'google' || source === 'fontsource';
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

/** Ключ семейства каталога для записи библиотеки (без суффикса :dup:N). */
export function getLibraryEntryCatalogKey(
  fontEntry: Pick<SavedLibraryFontEntry, 'id' | 'source'> | null | undefined,
): string | null {
  const id = String(fontEntry?.id || '').trim();
  const source = String(fontEntry?.source || '').trim();
  if (!id || !source) return null;
  if (source === 'google') {
    const raw = id.replace(/^google:/i, '').replace(/:dup:\d+$/i, '').trim();
    return raw ? `google:${normalizeLibraryText(raw).toLowerCase()}` : null;
  }
  if (source === 'fontsource') {
    const raw = id.replace(/^fontsource:/i, '').replace(/:dup:\d+$/i, '').trim();
    return raw ? `fontsource:${normalizeLibraryText(raw).toLowerCase()}` : null;
  }
  if (source === 'fontshare') {
    const raw = id.replace(/^fontshare:/i, '').replace(/:dup:\d+$/i, '').trim();
    return raw ? `fontshare:${normalizeLibraryText(raw).toLowerCase()}` : null;
  }
  return `${source}:${id.toLowerCase()}`;
}

export function countSameCatalogFontInLibrary(
  fontEntry: SavedLibraryFontEntry | null | undefined,
  libraryFonts: SavedLibraryFontEntry[] | null | undefined,
): number {
  const key = getLibraryEntryCatalogKey(sanitizeLibraryFont(fontEntry) || fontEntry);
  if (!key) return 0;
  return (Array.isArray(libraryFonts) ? libraryFonts : []).filter(
    (item) => getLibraryEntryCatalogKey(item) === key,
  ).length;
}

export function formatLibraryPickerLabel(libraryName: string, matchCount: number): string {
  const name = String(libraryName || '').trim() || 'Библиотека';
  return matchCount > 0 ? `${name} (${matchCount})` : name;
}

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

function normalizeCatalogFamilyKey(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function googleSessionFamilyKeys(font: SessionFontRecord): Set<string> {
  const keys = new Set<string>();
  const add = (value: unknown) => {
    const raw = normalizeCatalogFamilyKey(value);
    if (!raw) return;
    keys.add(raw);
    const withoutVariable = raw.replace(/\s+variable$/i, '').trim();
    if (withoutVariable) keys.add(withoutVariable);
  };
  add(font.name);
  add(font.displayName);
  add(String(font.originalName || '').replace(/\.woff2$/i, ''));
  return keys;
}

export function findGoogleFontInSession(
  fonts: SessionFontRecord[] | null | undefined,
  family: string,
): SessionFontRecord | null {
  const target = normalizeCatalogFamilyKey(family);
  if (!target) return null;
  const targetBase = target.replace(/\s+variable$/i, '').trim();
  return (
    (Array.isArray(fonts) ? fonts : []).find((font) => {
      if (font?.source !== 'google') return false;
      const keys = googleSessionFamilyKeys(font);
      return keys.has(target) || (targetBase ? keys.has(targetBase) : false);
    }) || null
  );
}

/** Копия записи в той же библиотеке: «Roboto 2», id `google:roboto:dup:2`. */
export function buildDuplicatedLibraryFontEntry(
  fontEntry: SavedLibraryFontEntry,
  libraryFonts: SavedLibraryFontEntry[] | null | undefined,
): SavedLibraryFontEntry | null {
  const base = sanitizeLibraryFont(fontEntry);
  if (!base) return null;
  const rootLabel = String(base.label || '')
    .trim()
    .replace(/\s+\d+$/i, '')
    .trim();
  if (!rootLabel) return null;

  const labelPattern = new RegExp(`^${escapeRegExp(rootLabel)}(?:\\s+(\\d+))?$`, 'i');
  let maxLabelSuffix = 1;
  for (const item of Array.isArray(libraryFonts) ? libraryFonts : []) {
    const match = String(item?.label || '').trim().match(labelPattern);
    if (!match) continue;
    maxLabelSuffix = Math.max(maxLabelSuffix, match[1] ? Number.parseInt(match[1], 10) : 1);
  }
  const nextLabelSuffix = maxLabelSuffix + 1;
  const label = `${rootLabel} ${nextLabelSuffix}`;

  const rootId = String(base.id || '').replace(/:dup:\d+$/i, '').trim();
  let maxDupSuffix = 1;
  for (const item of Array.isArray(libraryFonts) ? libraryFonts : []) {
    const itemId = String(item?.id || '').trim();
    if (itemId === rootId) maxDupSuffix = Math.max(maxDupSuffix, 1);
    const dupMatch = itemId.match(/:dup:(\d+)$/i);
    if (dupMatch && itemId.startsWith(`${rootId}:dup:`)) {
      maxDupSuffix = Math.max(maxDupSuffix, Number.parseInt(dupMatch[1], 10));
    }
  }
  const nextDupSuffix = maxDupSuffix + 1;
  const id = `${rootId}:dup:${nextDupSuffix}`;

  return stampLibraryFontAddedNow({
    ...base,
    id,
    label,
  });
}

export function findFontsourceFontInSession(
  fonts: SessionFontRecord[] | null | undefined,
  slug: string,
): SessionFontRecord | null {
  const target = normalizeCatalogFamilyKey(slug);
  if (!target) return null;
  return (
    (Array.isArray(fonts) ? fonts : []).find(
      (font) => font?.source === 'fontsource' && normalizeCatalogFamilyKey(font.name) === target,
    ) || null
  );
}

export function findFontshareFontInSession(
  fonts: SessionFontRecord[] | null | undefined,
  slug: string,
): SessionFontRecord | null {
  const target = String(slug || '').trim();
  if (!target) return null;
  const targetLower = target.toLowerCase();
  return (
    (Array.isArray(fonts) ? fonts : []).find(
      (font) =>
        font?.source === 'fontshare' &&
        (font.name === target || font.originKey === `fontshare:${target}` || font.name?.toLowerCase() === targetLower),
    ) || null
  );
}

export function isGoogleFontInSession(fonts: SessionFontRecord[] | null | undefined, family: string): boolean {
  return findGoogleFontInSession(fonts, family) != null;
}

export function isFontsourceFontInSession(fonts: SessionFontRecord[] | null | undefined, slug: string): boolean {
  return findFontsourceFontInSession(fonts, slug) != null;
}

export function buildSessionFontDuplicateUploadInput(
  sessionFont: SessionFontRecord | null | undefined,
): Record<string, unknown> & { file: Blob; name: string } | null {
  if (!sessionFont || !(sessionFont.file instanceof Blob) || sessionFont.file.size === 0) {
    return null;
  }
  const { id: _id, url: _url, ...rest } = sessionFont;
  const name =
    String(sessionFont.originalName || '').trim() ||
    String(sessionFont.name || '').trim() ||
    'font.woff2';
  return {
    ...rest,
    file: sessionFont.file,
    name,
  };
}

export function focusSessionFontInEditor(
  font: SessionFontRecord,
  {
    setClosedLibraryFontIds,
    safeSelectFont,
    setMainTab,
  }: {
    setClosedLibraryFontIds: Dispatch<SetStateAction<string[]>>;
    safeSelectFont: (font: SessionFontRecord) => void;
    setMainTab: Dispatch<SetStateAction<string>>;
  },
): void {
  const fontId = String(font.id || '').trim();
  if (!fontId) return;
  setClosedLibraryFontIds((prev) => prev.filter((id) => id !== fontId));
  safeSelectFont(font);
  setMainTab(fontId);
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
