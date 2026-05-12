import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';

/** Полная или минимальная запись Google Fonts для карточки каталога. */
export function resolveGoogleCatalogEntryFromShareItem(item) {
  if (!item || item.kind !== 'catalog-ref' || String(item.source || '').toLowerCase() !== 'google') return null;
  const family = String(item.family || item.key || '').trim();
  if (!family) return null;
  const list = readGoogleFontCatalogCache();
  const row =
    Array.isArray(list) &&
    list.find((r) => String(r?.family || '').trim().toLowerCase() === family.toLowerCase());
  if (row) return row;
  return {
    family,
    subsets: [],
    isVariable: false,
    styleCount: 0,
    category: null,
    hasItalic: false,
    hasItalicStyles: false,
  };
}

/** Полная или минимальная запись Fontsource для карточки каталога. */
export function resolveFontsourceCatalogItemFromShareItem(item) {
  if (!item || item.kind !== 'catalog-ref' || String(item.source || '').toLowerCase() !== 'fontsource') {
    return null;
  }
  const slug = String(item.key || '').trim();
  if (!slug) return null;
  const list = readFontsourceCatalogCache();
  const row =
    Array.isArray(list) &&
    list.find(
      (r) =>
        String(r?.id || r?.slug || '')
          .trim()
          .toLowerCase() === slug.toLowerCase(),
    );
  if (row) return row;
  return {
    id: slug,
    slug,
    family: String(item.family || slug),
    isVariable: false,
    styleCount: 1,
    subsets: [],
    hasItalic: false,
    category: null,
  };
}
