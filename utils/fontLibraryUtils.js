export function normalizeLibraryText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export const RECENT_LIBRARY_ENTRY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getLibrarySourceLabel(source) {
  if (source === 'google') return 'Google';
  if (source === 'fontsource') return 'Fontsource';
  if (source === 'local') return 'Локальный';
  return 'Сессия';
}

export function sanitizeLibraryFont(font) {
  if (!font || typeof font !== 'object') return null;
  const label = normalizeLibraryText(font.label);
  if (!label) return null;
  const sanitized = {
    id: String(font.id || `font:${label.toLowerCase()}`),
    label,
    source: String(font.source || 'session'),
  };
  if (font.source === 'fontsource' && font.isVariable === true) {
    sanitized.isVariable = true;
  }
  const addedAt = Number(font.addedAt);
  if (Number.isFinite(addedAt) && addedAt > 0) {
    sanitized.addedAt = addedAt;
  }
  return sanitized;
}

export function stampLibraryFontAddedNow(font) {
  const sanitized = sanitizeLibraryFont(font);
  if (!sanitized) return null;
  return {
    ...sanitized,
    addedAt: Date.now(),
  };
}

export function isLibraryFontRecentlyAdded(font, now = Date.now()) {
  const addedAt = Number(font?.addedAt);
  if (!Number.isFinite(addedAt) || addedAt <= 0) return false;
  return now - addedAt < RECENT_LIBRARY_ENTRY_WINDOW_MS;
}

/** Сколько записей в библиотеке помечены как недавно добавленные (см. {@link isLibraryFontRecentlyAdded}). */
export function countRecentlyAddedLibraryFonts(fonts, now = Date.now()) {
  if (!Array.isArray(fonts)) return 0;
  let n = 0;
  for (const font of fonts) {
    if (isLibraryFontRecentlyAdded(font, now)) n += 1;
  }
  return n;
}

export function sanitizeLibrary(library) {
  if (!library || typeof library !== 'object') return null;
  const name = normalizeLibraryText(library.name);
  if (!name) return null;
  const fonts = (Array.isArray(library.fonts) ? library.fonts : [])
    .map(sanitizeLibraryFont)
    .filter(Boolean);
  return {
    id: String(library.id || `library-${Date.now()}`),
    name,
    fonts,
  };
}

export function mapSessionFontsToLibraryEntries(sessionFonts) {
  return (Array.isArray(sessionFonts) ? sessionFonts : []).map((font) => ({
    id: `session:${font.id || font.name || font.displayName}`,
    label: font.displayName || font.name || 'Без названия',
    source: font.source || 'session',
  }));
}

export function createCatalogLibraryEntry({ source, key, label, isVariable = false }) {
  const normalizedKey = normalizeLibraryText(key);
  const normalizedLabel = normalizeLibraryText(label || key);
  if (!source || !normalizedKey || !normalizedLabel) return null;
  const entry = {
    id: `${source}:${normalizedKey}`,
    label: normalizedLabel,
    source,
  };
  if (source === 'fontsource' && isVariable) {
    entry.isVariable = true;
  }
  return entry;
}

export function mapGoogleCatalogItemsToLibraryEntries(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) =>
      createCatalogLibraryEntry({
        source: 'google',
        key: item.family,
        label: item.family,
      }),
    )
    .filter(Boolean);
}

export function mapFontsourceCatalogItemsToLibraryEntries(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) =>
      createCatalogLibraryEntry({
        source: 'fontsource',
        key: item.id || item.slug,
        label: item.family || item.label || item.id || item.slug,
        isVariable: Boolean(item?.isVariable),
      }),
    )
    .filter(Boolean);
}

/** Ключи для сопоставления сессионного шрифта с `id` записей в библиотеках. */
export function getSessionFontLibraryEntryMatchKeys(font) {
  const keys = [];
  const add = (k) => {
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
export function getFontIdsToRemoveWhenLibraryDeleted(fonts, deletedLibrary, remainingLibraries) {
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

  const out = [];
  for (const font of fonts || []) {
    const keys = getSessionFontLibraryEntryMatchKeys(font);
    const hitsDeleted = keys.some((k) => deletedEntryIds.has(k));
    const staysInOther = keys.some((k) => otherEntryIds.has(k));
    if (hitsDeleted && !staysInOther) out.push(font.id);
  }
  return out;
}

export function isGoogleFontInSession(fonts, family) {
  return (Array.isArray(fonts) ? fonts : []).some(
    (font) =>
      font?.source === 'google' &&
      (font.originalName === `${family}.woff2` ||
        font.name === family ||
        font.displayName === family),
  );
}

export function isFontsourceFontInSession(fonts, slug) {
  return (Array.isArray(fonts) ? fonts : []).some(
    (font) => font?.source === 'fontsource' && font.name === slug,
  );
}

export function mergeLibraryEntries(...groups) {
  const merged = new Map();
  groups.flat().forEach((item) => {
    if (!item?.label) return;
    const key = item.label.toLowerCase();
    if (!merged.has(key)) {
      merged.set(key, item);
    }
  });
  return Array.from(merged.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'ru', { sensitivity: 'base' }),
  );
}
