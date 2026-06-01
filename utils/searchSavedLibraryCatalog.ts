import { searchPreferredSavedLibraryCatalog } from './libraryPickerCatalogSearch';
import type { SavedLibraryCatalogSearchRow } from '../types/savedLibraryCard';
import type { SearchSavedLibraryCatalogParams } from '../types/savedLibrary';

/** Результаты Fontsource-first при поиске внутри сохранённой библиотеки. */
export function searchSavedLibraryCatalog({
  searchQueryTrimmed,
  libraryFontIds,
}: SearchSavedLibraryCatalogParams): SavedLibraryCatalogSearchRow[] {
  return searchPreferredSavedLibraryCatalog({ searchQueryTrimmed, libraryFontIds });
}
