import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import { matchesSearch } from './searchMatching';
import type { SavedLibraryCatalogSearchRow } from '../types/savedLibraryCard';
import type { SearchSavedLibraryCatalogParams } from '../types/savedLibrary';

const CATALOG_SEARCH_LIMIT = 60;

/** Результаты Google/Fontsource при поиске внутри сохранённой библиотеки. */
export function searchSavedLibraryCatalog({
  searchQueryTrimmed,
  libraryFontIds,
}: SearchSavedLibraryCatalogParams): SavedLibraryCatalogSearchRow[] {
  if (!searchQueryTrimmed) return [];

  const query = searchQueryTrimmed;
  const ids = libraryFontIds instanceof Set ? libraryFontIds : new Set<string>();
  const out: SavedLibraryCatalogSearchRow[] = [];

  const google = readGoogleFontCatalogCache();
  (Array.isArray(google) ? google : []).forEach((entry) => {
    const family = String(entry?.family || '').trim();
    if (!family) return;
    if (!matchesSearch([family, entry?.category, ...(entry?.subsets || [])], query)) return;
    const libraryId = `google:${family}`;
    out.push({
      id: `catalog-google:${family}`,
      source: 'google',
      family,
      entry: entry as Record<string, unknown>,
      alreadyInLibrary: ids.has(libraryId),
    });
  });

  const fontsource = readFontsourceCatalogCache();
  (Array.isArray(fontsource) ? fontsource : []).forEach((item) => {
    const slug = String(item?.id || item?.slug || '').trim();
    const family = String(item?.family || item?.label || slug).trim();
    if (!slug || !family) return;
    if (!matchesSearch([family, slug, item?.category, ...(item?.subsets || [])], query)) return;
    const libraryId = `fontsource:${slug}`;
    out.push({
      id: `catalog-fontsource:${slug}`,
      source: 'fontsource',
      slug,
      family,
      item: item as Record<string, unknown>,
      alreadyInLibrary: ids.has(libraryId),
    });
  });

  return out.slice(0, CATALOG_SEARCH_LIMIT);
}
