import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from './googleFontLoader';
import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import type { SavedLibraryRecord } from '../types/editorFonts';

type LibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

type GoogleCatalogRow = {
  family?: string;
  subsets?: string[];
  isVariable?: boolean;
  wghtMin?: number;
  wghtMax?: number;
};

/**
 * Фоновая подгрузка файла после «+» в библиотеку: без сессии редактора и вкладок,
 * только прогрев сети/диска (HTTP-кэш) для последующего «Открыть».
 */
export function prefetchGoogleLibraryFontEntry(fontEntry: LibraryFontEntry): void {
  const family = String(fontEntry?.label || '').trim();
  if (!family) return;
  void (async () => {
    try {
      const catalogEntry = readGoogleFontCatalogCache().find(
        (item) =>
          String((item as GoogleCatalogRow)?.family || '')
            .trim()
            .toLowerCase() === family.toLowerCase(),
      ) as GoogleCatalogRow | undefined;
      if (!catalogEntry?.family) return;
      const subsetList = Array.isArray(catalogEntry.subsets) ? catalogEntry.subsets : [];
      const useVariable = catalogEntry.isVariable === true;
      if (useVariable) {
        await fetchGoogleVariableFontSlicesAll(family, {
          subsets: subsetList,
          ...(catalogEntry.wghtMin != null && catalogEntry.wghtMax != null
            ? { wghtMin: catalogEntry.wghtMin, wghtMax: catalogEntry.wghtMax }
            : {}),
        });
      } else {
        await fetchGoogleStaticFontSlicesAll(family, {
          weight: 400,
          italic: false,
          subsets: subsetList,
        });
      }
    } catch {
      /* фон: без уведомлений */
    }
  })();
}

function fontsourceRowBySlug(slug: string): Record<string, unknown> | null {
  const items = readFontsourceCatalogCache();
  const arr = Array.isArray(items) ? items : [];
  return (
    arr.find((row) => String((row as { id?: string; slug?: string })?.id || row?.slug || '') === String(slug || '')) ||
    null
  );
}

export function prefetchFontsourceLibraryFontEntry(fontEntry: LibraryFontEntry): void {
  const entryId = String(fontEntry?.id || '').trim();
  const slug = entryId.startsWith('fontsource:') ? entryId.slice('fontsource:'.length) : '';
  if (!slug) return;
  void (async () => {
    try {
      const row = fontsourceRowBySlug(slug);
      const isVariable = Boolean(row?.variable || row?.isVariable);
      const apiUrl = isVariable
        ? `/api/fontsource/${encodeURIComponent(slug)}/variable?subset=latin&style=normal&forceVariable=true`
        : `/api/fontsource/${encodeURIComponent(slug)}?weight=400&style=normal&subset=latin`;
      const response = await fetch(apiUrl);
      if (!response.ok) return;
      await response.arrayBuffer();
    } catch {
      /* фон */
    }
  })();
}
