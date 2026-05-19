import { isShareCatalogItemVariable } from './libraryShareImport';

/** Подсчёт шрифтов для панели «Скачивание» на странице share. */
export function computeShareFontStats(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let staticCount = 0;
  let variableCount = 0;
  let localCount = 0;

  list.forEach((row) => {
    if (row?.kind === 'catalog-ref') {
      if (isShareCatalogItemVariable(row.shareItem, row.libraryFont)) variableCount += 1;
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
    local: localCount,
    catalog: staticCount + variableCount,
  };
}
