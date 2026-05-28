import { toast } from './appNotify';
import { buildSafeFileBase, saveBlobAsFile, uniqueDownloadFileName } from './fileDownloadUtils';
import { ensureFontBlobFormat } from './fontFormatConvertClient';
import { createZipBlob } from './zipUtils';

export type CatalogStyleVariant = { weight?: number; style?: string; label?: string };

type SilentOpts = { silent?: boolean };

/**
 * Скачать одно или несколько начертаний в targetFormat (zip при >1).
 */
export async function downloadCatalogStylesAsFormat({
  familyLabel,
  zipBaseFallback,
  variants,
  format,
  silent = false,
  fetchVariantBlob,
  buildVariantFileBase,
}: {
  familyLabel: string;
  zipBaseFallback: string;
  variants: CatalogStyleVariant[];
  format: string;
  silent?: boolean;
  fetchVariantBlob: (variant: CatalogStyleVariant) => Promise<Blob | null>;
  buildVariantFileBase: (variant: CatalogStyleVariant) => string;
}): Promise<boolean> {
  const list = Array.isArray(variants) ? variants : [];
  if (!familyLabel || list.length === 0) return false;

  const targetFormat = String(format || 'woff2').toLowerCase();

  try {
    if (list.length === 1) {
      const [variant] = list;
      const blob = await fetchVariantBlob(variant);
      if (!blob) throw new Error('Пустой файл');
      const outBlob = await ensureFontBlobFormat(blob, targetFormat);
      const base = buildVariantFileBase(variant);
      saveBlobAsFile(outBlob, `${base}.${targetFormat}`);
      if (!silent) {
        toast.success(`Скачан ${variant.label || familyLabel} (${targetFormat.toUpperCase()})`);
      }
      return true;
    }

    const files: { name: string; data: Blob }[] = [];
    const usedNames = new Set<string>();
    for (const variant of list) {
      // eslint-disable-next-line no-await-in-loop
      const blob = await fetchVariantBlob(variant);
      if (!blob) continue;
      // eslint-disable-next-line no-await-in-loop
      const outBlob = await ensureFontBlobFormat(blob, targetFormat);
      const base = buildVariantFileBase(variant);
      files.push({
        name: uniqueDownloadFileName(`${base}.${targetFormat}`, usedNames),
        data: outBlob,
      });
    }
    if (files.length === 0) throw new Error('Нет файлов');
    const stamp = new Date().toISOString().slice(0, 10);
    const zipBlob = await createZipBlob(files);
    const zipBase = buildSafeFileBase(familyLabel, zipBaseFallback);
    saveBlobAsFile(zipBlob, `${zipBase}-styles-${stamp}.zip`);
    if (!silent) {
      toast.success(
        files.length === 1
          ? `Скачано 1 начертание (${targetFormat.toUpperCase()})`
          : `Скачано ${files.length} начертаний (${targetFormat.toUpperCase()})`,
      );
    }
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать начертания ${familyLabel}`);
    return false;
  }
}

export type { SilentOpts };
