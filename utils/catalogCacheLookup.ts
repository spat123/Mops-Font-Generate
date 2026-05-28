import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';

export function parseFontsourceEntrySlug(entryId: string): string {
  const id = String(entryId || '').trim();
  return id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
}

export function resolveGoogleCatalogEntry(family: string): Record<string, unknown> | null {
  const normalized = String(family || '').trim().toLowerCase();
  if (!normalized) return null;
  const list = readGoogleFontCatalogCache();
  return (
    (Array.isArray(list) ? list : []).find(
      (row) => String(row?.family || '').trim().toLowerCase() === normalized,
    ) || null
  );
}

export function resolveFontsourceCatalogItem(slug: string): Record<string, unknown> | null {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return null;
  const list = readFontsourceCatalogCache();
  return (
    (Array.isArray(list) ? list : []).find(
      (row) =>
        String(row?.id || row?.slug || '')
          .trim()
          .toLowerCase() === normalized,
    ) || null
  );
}
