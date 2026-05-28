import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import type { SavedLibraryCatalogLookup } from '../types/savedLibrary';

/** Индексы Google / Fontsource для метаданных карточек сохранённой библиотеки. */
export function buildSavedLibraryCatalogLookup(): SavedLibraryCatalogLookup {
  const googleByFamily = new Map<string, Record<string, unknown>>();
  const fontsourceBySlug = new Map<string, Record<string, unknown>>();

  const google = readGoogleFontCatalogCache();
  (Array.isArray(google) ? google : []).forEach((entry) => {
    const family = String(entry?.family || '').trim();
    if (!family) return;
    googleByFamily.set(family.toLowerCase(), entry as Record<string, unknown>);
  });

  const fontsource = readFontsourceCatalogCache();
  (Array.isArray(fontsource) ? fontsource : []).forEach((item) => {
    const slug = String(item?.id || item?.slug || '').trim();
    if (!slug) return;
    fontsourceBySlug.set(slug, item as Record<string, unknown>);
  });

  return { googleByFamily, fontsourceBySlug };
}
