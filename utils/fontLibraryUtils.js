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
