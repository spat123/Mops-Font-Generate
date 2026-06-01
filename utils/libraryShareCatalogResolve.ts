import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import { readFontshareCatalogCache } from './fontshareCatalogCache';
import { readFontfabricTrialCatalogCache } from './fontfabricTrialCatalogCache';
import type { ShareCatalogItem } from './libraryShareImport';

/** Полная или минимальная запись Google Fonts для карточки каталога. */
export function resolveGoogleCatalogEntryFromShareItem(
  item: ShareCatalogItem | null | undefined,
): Record<string, unknown> | null {
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
    category: null,
    hasItalic: false,
    hasItalicStyles: false,
  };
}

/** Полная или минимальная запись Fontsource для карточки каталога. */
export function resolveFontsourceCatalogItemFromShareItem(
  item: ShareCatalogItem | null | undefined,
): Record<string, unknown> | null {
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
    subsets: [],
    hasItalic: false,
    category: null,
  };
}

/** Полная или минимальная запись Fontshare для карточки share. */
export function resolveFontshareCatalogItemFromShareItem(
  item: ShareCatalogItem | null | undefined,
): Record<string, unknown> | null {
  if (!item || item.kind !== 'catalog-ref' || String(item.source || '').toLowerCase() !== 'fontshare') {
    return null;
  }
  const slug = String(item.key || '').trim();
  if (!slug) return null;
  const list = readFontshareCatalogCache();
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
    pageUrl: `https://www.fontshare.com/fonts/${encodeURIComponent(slug)}`,
    source: 'fontshare',
  };
}

/** Полная или минимальная запись Fontfabric trial для карточки share. */
export function resolveFontfabricTrialCatalogItemFromShareItem(
  item: ShareCatalogItem | null | undefined,
): Record<string, unknown> | null {
  if (
    !item ||
    item.kind !== 'catalog-ref' ||
    String(item.source || '').toLowerCase() !== 'fontfabric-trial'
  ) {
    return null;
  }
  const slug = String(item.key || '').trim();
  if (!slug) return null;
  const list = readFontfabricTrialCatalogCache();
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
    slug,
    family: String(item.family || slug),
    trialUrl: `https://www.fontfabric.com/fonts/${encodeURIComponent(slug)}/`,
  };
}
