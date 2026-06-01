import { isShareCatalogItemVariable } from './libraryShareImport';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';
import type { ShareCatalogItem, ShareCloudItem } from './libraryShareImport';

export type ShareFontStatsRow = {
  kind?: string;
  shareItem?: ShareCatalogItem | ShareCloudItem;
  libraryFont?: SavedLibraryFontEntry | null;
};

export type ShareFontStats = {
  total: number;
  static: number;
  variable: number;
  external: number;
  local: number;
  catalog: number;
};

/** Подсчёт шрифтов для панели «Скачивание» на странице share. */
export function computeShareFontStats(rows: ShareFontStatsRow[] | null | undefined): ShareFontStats {
  const list = Array.isArray(rows) ? rows : [];
  let staticCount = 0;
  let variableCount = 0;
  let externalCount = 0;
  let localCount = 0;

  list.forEach((row) => {
    if (row?.kind === 'catalog-ref') {
      const source = String((row.shareItem as ShareCatalogItem)?.source || '').toLowerCase();
      if (source === 'fontshare' || source === 'fontfabric-trial') {
        externalCount += 1;
        return;
      }
      if (isShareCatalogItemVariable(row.shareItem as ShareCatalogItem, row.libraryFont)) variableCount += 1;
      else staticCount += 1;
      return;
    }
    if (row?.kind === 'cloud-upload-ref') {
      localCount += 1;
    }
  });

  return {
    total: list.length,
    static: staticCount,
    variable: variableCount,
    external: externalCount,
    local: localCount,
    catalog: staticCount + variableCount + externalCount,
  };
}
