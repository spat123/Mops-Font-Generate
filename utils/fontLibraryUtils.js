export function normalizeLibraryText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

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
  return {
    id: String(font.id || `font:${label.toLowerCase()}`),
    label,
    source: String(font.source || 'session'),
  };
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

export function mapGoogleCatalogItemsToLibraryEntries(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    id: `google:${item.family}`,
    label: item.family,
    source: 'google',
  }));
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
