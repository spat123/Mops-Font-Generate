import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import { readFontshareCatalogCache } from './fontshareCatalogCache';
import { readFontfabricTrialCatalogCache } from './fontfabricTrialCatalogCache';
import type { SavedLibraryCatalogLookup } from '../types/savedLibrary';

/** Индексы каталогов для метаданных карточек сохранённой библиотеки. */
export function buildSavedLibraryCatalogLookup(): SavedLibraryCatalogLookup {
  const googleByFamily = new Map<string, Record<string, unknown>>();
  const fontsourceBySlug = new Map<string, Record<string, unknown>>();
  const fontshareBySlug = new Map<string, Record<string, unknown>>();
  const fontfabricTrialBySlug = new Map<string, Record<string, unknown>>();

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

  const fontshare = readFontshareCatalogCache();
  (Array.isArray(fontshare) ? fontshare : []).forEach((item) => {
    const slug = String(item?.id || item?.slug || '').trim();
    if (!slug) return;
    fontshareBySlug.set(slug.toLowerCase(), item as Record<string, unknown>);
  });

  const trial = readFontfabricTrialCatalogCache();
  (Array.isArray(trial) ? trial : []).forEach((item) => {
    const slug = String(item?.id || item?.slug || '').trim();
    if (!slug) return;
    fontfabricTrialBySlug.set(slug.toLowerCase(), item as Record<string, unknown>);
  });

  return { googleByFamily, fontsourceBySlug, fontshareBySlug, fontfabricTrialBySlug };
}
