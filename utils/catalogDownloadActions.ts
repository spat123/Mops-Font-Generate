import { toast } from './appNotify';
import { buildSafeFileBase, saveBlobAsFile, uniqueDownloadFileName } from './fileDownloadUtils';
import {
  fetchGoogleStaticFontSlicesAll,
  fetchGoogleVariableFontSlicesAll,
} from './googleFontLoader';
import { ensureFontBlobFormat } from './fontFormatConvertClient';
import { createZipBlob } from './zipUtils';
import { downloadCatalogStylesAsFormat } from './catalogStyleDownload';
import {
  fetchFontsourceDownloadPayload,
  fontsourceArrayBufferFromBase64,
  fontsourceBlobFromPayload,
  getFontsourceStaticApiUrl,
  getFontsourceVariableApiUrl,
} from './fontsourceDownloadClient';
import type { CatalogRow } from '../types/catalog';

type CatalogEntry = CatalogRow & {
  family?: string;
  subsets?: string[];
  isVariable?: boolean;
  wghtMin?: number;
  wghtMax?: number;
  id?: string;
  slug?: string;
};

type FontStyleVariant = { weight?: number; style?: string; label?: string };
type ZipFileEntry = { name: string; data: Blob | ArrayBuffer };
type ArchiveEntry = { name: string; data: Blob };
type SilentOpts = { silent?: boolean };
function getGoogleSliceBlob(slice: unknown): Blob | null {
  const row = slice as { blob?: unknown };
  return row?.blob instanceof Blob && row.blob.size > 0 ? row.blob : null;
}

function getGoogleSliceRow(slice: unknown): { blob: Blob; style?: string; weight?: number } | null {
  const blob = getGoogleSliceBlob(slice);
  if (!blob) return null;
  const row = slice as { style?: string; weight?: number };
  return { blob, style: row.style, weight: row.weight };
}

export async function buildArchiveBlobFromEntries(entries: ZipFileEntry[]): Promise<Blob> {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Нет файлов для архива');
  }
  return createZipBlob(entries);
}

export function saveArchiveBlob(blob: Blob, fileName: string): void {
  saveBlobAsFile(blob, fileName);
}

/** Слайсы Google (форма зависит от googleFontLoader). */
export async function getGoogleSlicesForDownload(entry: CatalogEntry): Promise<unknown[]> {
  const family = String(entry?.family || '');
  if (!family) return [];
  const subsetList = Array.isArray(entry.subsets) ? entry.subsets : [];
  const useVariable = entry.isVariable === true;
  const slices = useVariable
    ? await fetchGoogleVariableFontSlicesAll(family, {
        subsets: subsetList,
        ...(entry.wghtMin != null && entry.wghtMax != null
          ? { wghtMin: entry.wghtMin, wghtMax: entry.wghtMax }
          : {}),
      })
    : await fetchGoogleStaticFontSlicesAll(family, {
        weight: 400,
        italic: false,
        subsets: subsetList,
      });
  return Array.isArray(slices) ? slices.filter((slice) => getGoogleSliceBlob(slice) !== null) : [];
}

export async function fetchGoogleVariableTtfBlob(family: string): Promise<Blob> {
  const response = await fetch(`/api/google-font-github-vf?family=${encodeURIComponent(family)}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error('Пустой файл');
  return blob;
}

export async function getGooglePackageFiles(entry: CatalogEntry): Promise<ZipFileEntry[]> {
  const family = String(entry?.family || '');
  if (!family) return [];
  const baseName = buildSafeFileBase(family, 'google-font');
  const slices = await getGoogleSlicesForDownload(entry);
  if (slices.length === 0) return [];

  const files = slices
    .map((slice, index) => {
      const row = getGoogleSliceRow(slice);
      if (!row) return null;
      return {
        name: `${baseName}/web/${baseName}-${row.style || 'normal'}-${row.weight || 400}-${index + 1}.woff2`,
        data: row.blob,
      };
    })
    .filter((file): file is { name: string; data: Blob } => file !== null);

  if (entry?.isVariable === true) {
    try {
      const variableBlob = await fetchGoogleVariableTtfBlob(family);
      files.push({ name: `${baseName}/source/${baseName}-variable.ttf`, data: variableBlob });
    } catch {
      // optional source file
    }
  }

  return files;
}

export async function buildGooglePackageArchiveEntry(entry: CatalogEntry): Promise<ArchiveEntry | null> {
  const family = entry?.family;
  if (!family) return null;
  const files = await getGooglePackageFiles(entry);
  if (files.length === 0) return null;
  const baseName = buildSafeFileBase(family, 'google-font');
  const zipBlob = await createZipBlob(files);
  return { name: `${baseName}-package.zip`, data: zipBlob };
}

export async function buildGoogleFormatArchiveEntry(
  entry: CatalogEntry,
  format: string,
): Promise<ArchiveEntry | null> {
  const family = entry?.family;
  if (!family) return null;
  const targetFormat = String(format || 'woff2').toLowerCase();
  const slices = await getGoogleSlicesForDownload(entry);
  const firstBlob = getGoogleSliceBlob(slices[0]);
  if (!firstBlob) return null;
    const outBlob = await ensureFontBlobFormat(firstBlob, targetFormat);
  const baseName = buildSafeFileBase(family, 'google-font');
  return { name: `${baseName}.${targetFormat}`, data: outBlob };
}

export async function downloadGoogleCurrentWoff2(
  entry: CatalogEntry,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const family = entry?.family;
  if (!family) return false;
  try {
    const slices = await getGoogleSlicesForDownload(entry);
    const firstBlob = getGoogleSliceBlob(slices[0]);
    if (!firstBlob) throw new Error('Пустой файл');
    const baseName = buildSafeFileBase(family, 'google-font');
    const fileName = `${baseName}${entry?.isVariable ? '-variable' : ''}.woff2`;
    saveBlobAsFile(firstBlob, fileName);
    if (!silent) toast.success(`Скачан ${family}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать ${family}`);
    return false;
  }
}

export async function downloadGoogleAsFormat(
  entry: CatalogEntry,
  format: string,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const family = entry?.family;
  if (!family) return false;
  const targetFormat = String(format || 'woff2').toLowerCase();
  try {
    const slices = await getGoogleSlicesForDownload(entry);
    const firstBlob = getGoogleSliceBlob(slices[0]);
    if (!firstBlob) throw new Error('Пустой файл');
    const outBlob = await ensureFontBlobFormat(firstBlob, targetFormat);
    const baseName = buildSafeFileBase(family, 'google-font');
    saveBlobAsFile(outBlob, `${baseName}.${targetFormat}`);
    if (!silent) toast.success(`Скачан ${family} (${targetFormat.toUpperCase()})`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось конвертировать ${family} в ${targetFormat.toUpperCase()}`);
    return false;
  }
}

export async function downloadGoogleVariableVariant(
  entry: CatalogEntry,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const family = entry?.family;
  if (!family || entry?.isVariable !== true) return false;
  try {
    const blob = await fetchGoogleVariableTtfBlob(family);
    const baseName = buildSafeFileBase(family, 'google-font');
    saveBlobAsFile(blob, `${baseName}-variable.ttf`);
    if (!silent) toast.success(`Скачан Variable ${family}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать Variable ${family}`);
    return false;
  }
}

async function fetchGoogleStaticSliceBlob(
  entry: CatalogEntry,
  { weight, style }: FontStyleVariant,
): Promise<Blob | null> {
  const family = entry?.family;
  if (!family) return null;
  const subsetList = Array.isArray(entry.subsets) ? entry.subsets : [];
  const slices = await fetchGoogleStaticFontSlicesAll(family, {
    weight: Number(weight) || 400,
    italic: style === 'italic',
    subsets: subsetList,
  });
  const first = Array.isArray(slices)
    ? slices.find((s) => s?.blob instanceof Blob && s.blob.size > 0)
    : null;
  return first?.blob instanceof Blob ? first.blob : null;
}

function buildGoogleStyleFileBase(entry: CatalogEntry, variant: FontStyleVariant): string {
  const familyBase = buildSafeFileBase(entry?.family, 'google-font');
  const stylePart = String(variant?.style || 'normal') === 'italic' ? 'italic' : 'normal';
  const weightPart = Number(variant?.weight) || 400;
  return `${familyBase}-${stylePart}-${weightPart}`;
}

/**
 * Скачать одно или несколько статических начертаний Google (не VF).
 * @param {object} entry — запись каталога Google
 * @param {Array<{ weight: number, style: string, label?: string }>} variants
 * @param {string} format
 */
export async function downloadGoogleStylesAsFormat(
  entry: CatalogEntry,
  variants: FontStyleVariant[],
  format: string,
  opts: SilentOpts = {},
): Promise<boolean> {
  const family = entry?.family;
  if (!family) return false;
  return downloadCatalogStylesAsFormat({
    familyLabel: family,
    zipBaseFallback: 'google-font',
    variants,
    format,
    silent: opts.silent,
    fetchVariantBlob: (variant) => fetchGoogleStaticSliceBlob(entry, variant),
    buildVariantFileBase: (variant) => buildGoogleStyleFileBase(entry, variant),
  });
}

async function fetchFontsourceStaticSliceBlob(
  item: CatalogEntry,
  variant: FontStyleVariant,
): Promise<Blob | null> {
  const slug = item?.id || item?.slug;
  if (!slug) return null;
  const { payload, fontBufferBase64 } = await fetchFontsourceDownloadPayload(
    getFontsourceStaticApiUrl(slug, variant?.weight, variant?.style),
  );
  return fontsourceBlobFromPayload(payload, fontBufferBase64, slug).blob;
}

export async function downloadFontsourceStylesAsFormat(
  item: CatalogEntry,
  variants: FontStyleVariant[],
  format: string,
  opts: SilentOpts = {},
): Promise<boolean> {
  const slug = item?.id || item?.slug;
  const family = item?.family || slug;
  if (!slug) return false;
  return downloadCatalogStylesAsFormat({
    familyLabel: family,
    zipBaseFallback: slug,
    variants,
    format,
    silent: opts.silent,
    fetchVariantBlob: async (variant) => {
      try {
        return await fetchFontsourceStaticSliceBlob(item, variant);
      } catch {
        return null;
      }
    },
    buildVariantFileBase: (variant) =>
      buildSafeFileBase(`${family}-${variant.style}-${variant.weight}`, slug),
  });
}

export async function downloadLocalStylesAsFormat(
  sessionFont: { file?: Blob; originalName?: string; name?: string },
  variants: FontStyleVariant[],
  format: string,
  label: string,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const list = Array.isArray(variants) ? variants : [];
  const fileBlob = sessionFont?.file instanceof Blob ? sessionFont.file : null;
  if (!fileBlob || list.length === 0) return false;

  const originalName =
    String(sessionFont?.originalName || '').trim() ||
    String(sessionFont?.name || '').trim() ||
    `${label || 'font'}.woff2`;
  const sourceFormat = String(originalName).split('.').pop()?.toLowerCase() || 'woff2';
  const targetFormat = String(format || 'woff2').toLowerCase();
  const fileBase = buildSafeFileBase(label || originalName, 'local-font');

  try {
    const outBlob =
      targetFormat === sourceFormat ? fileBlob : await ensureFontBlobFormat(fileBlob, targetFormat);
    const variant = list[0];
    const suffix =
      list.length === 1 && variant
        ? `-${variant.style === 'italic' ? 'italic' : 'normal'}-${variant.weight}`
        : '';
    saveBlobAsFile(outBlob, `${fileBase}${suffix}.${targetFormat}`);
    if (!silent) toast.success(`Скачан ${label || originalName} (${targetFormat.toUpperCase()})`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать ${label || originalName}`);
    return false;
  }
}

export async function downloadGooglePackageZip(
  entry: CatalogEntry,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const family = entry?.family;
  if (!family) return false;
  try {
    const files = await getGooglePackageFiles(entry);
    if (files.length === 0) throw new Error('Нет файлов для упаковки');
    const zipBlob = await createZipBlob(files);
    const baseName = buildSafeFileBase(family, 'google-font');
    saveBlobAsFile(zipBlob, `${baseName}-package.zip`);
    if (!silent) toast.success(`Скачан пакет ${family}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось собрать пакет ${family}`);
    return false;
  }
}

export async function getFontsourcePackageFiles(item: CatalogEntry): Promise<ZipFileEntry[]> {
  const slug = item?.id || item?.slug;
  if (!slug) return [];

  const baseName = buildSafeFileBase(item?.family || slug, slug);
  const files = [];

  try {
    const { payload, fontBufferBase64 } = await fetchFontsourceDownloadPayload(
      getFontsourceStaticApiUrl(slug),
    );
    const fileNameRaw = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
    const ext = fileNameRaw.split('.').pop()?.toLowerCase() || 'woff2';
    files.push({
      name: `${baseName}/web/${buildSafeFileBase(fileNameRaw, `${baseName}.${ext}`)}`,
      data: fontsourceArrayBufferFromBase64(fontBufferBase64),
    });
  } catch {
    // optional static file
  }

  if (item?.isVariable) {
    try {
      const { payload, fontBufferBase64 } = await fetchFontsourceDownloadPayload(
        getFontsourceVariableApiUrl(slug),
      );
      const fileNameRaw = String(payload?.fileName || `${slug}-variable.woff2`);
      files.push({
        name: `${baseName}/source/${buildSafeFileBase(fileNameRaw, `${baseName}-variable.woff2`)}`,
        data: fontsourceArrayBufferFromBase64(fontBufferBase64),
      });
    } catch {
      // optional variable file
    }
  }

  return files;
}

export async function buildFontsourcePackageArchiveEntry(
  item: CatalogEntry,
): Promise<ArchiveEntry | null> {
  const slug = item?.id || item?.slug;
  if (!slug) return null;
  const files = await getFontsourcePackageFiles(item);
  if (files.length === 0) return null;
  const baseName = buildSafeFileBase(item?.family || slug, slug);
  const zipBlob = await createZipBlob(files);
  return { name: `${baseName}-package.zip`, data: zipBlob };
}

export async function buildFontsourceFormatArchiveEntry(
  item: CatalogEntry,
  format: string,
): Promise<ArchiveEntry | null> {
  const slug = item?.id || item?.slug;
  if (!slug) return null;
  const targetFormat = String(format || 'woff2').toLowerCase();
  const isVariable = Boolean(item?.isVariable);
  const { payload, fontBufferBase64 } = await fetchFontsourceDownloadPayload(
    isVariable ? getFontsourceVariableApiUrl(slug) : getFontsourceStaticApiUrl(slug),
  );
  const { blob } = fontsourceBlobFromPayload(payload, fontBufferBase64, slug, { variable: isVariable });
  const converted = await ensureFontBlobFormat(blob, targetFormat);
  const baseName = buildSafeFileBase(item?.family || slug, slug);
  return { name: `${baseName}.${targetFormat}`, data: converted };
}

export async function buildSelectionArchiveEntries<T>(
  items: T[],
  buildEntry: (item: T) => Promise<ArchiveEntry | null>,
): Promise<ArchiveEntry[]> {
  const files = [];
  const usedNames = new Set<string>();
  for (const item of items) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const entry = await buildEntry(item);
      if (!entry?.data) continue;
      files.push({
        ...entry,
        name: uniqueDownloadFileName(entry.name, usedNames),
      });
    } catch {
      // skip failed item
    }
  }
  return files;
}

export async function downloadFontsourceCurrentFile(
  item: CatalogEntry,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const slug = item?.id || item?.slug;
  if (!slug) return false;
  try {
    const isVariable = Boolean(item?.isVariable);
    const { payload, fontBufferBase64 } = await fetchFontsourceDownloadPayload(
      isVariable ? getFontsourceVariableApiUrl(slug) : getFontsourceStaticApiUrl(slug),
    );
    const { ext, blob } = fontsourceBlobFromPayload(payload, fontBufferBase64, slug, {
      variable: isVariable,
    });
    const fileNameRaw = String(payload?.fileName || payload?.actualFileName || `${slug}.woff2`);
    const fallbackName = `${slug}${isVariable ? '-variable' : ''}.${ext || 'woff2'}`;
    saveBlobAsFile(blob, fileNameRaw || fallbackName);
    if (!silent) toast.success(`Скачан ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать ${item?.family || slug}`);
    return false;
  }
}

export async function downloadFontsourceAsFormat(
  item: CatalogEntry,
  format: string,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const slug = item?.id || item?.slug;
  if (!slug) return false;
  const targetFormat = String(format || 'woff2').toLowerCase();
  try {
    const isVariable = Boolean(item?.isVariable);
    const { payload, fontBufferBase64 } = await fetchFontsourceDownloadPayload(
      isVariable ? getFontsourceVariableApiUrl(slug) : getFontsourceStaticApiUrl(slug),
    );
    const { blob } = fontsourceBlobFromPayload(payload, fontBufferBase64, slug, { variable: isVariable });
    const converted = await ensureFontBlobFormat(blob, targetFormat);
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(converted, `${baseName}.${targetFormat}`);
    if (!silent) toast.success(`Скачан ${item?.family || slug} (${targetFormat.toUpperCase()})`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось конвертировать ${item?.family || slug} в ${targetFormat.toUpperCase()}`);
    return false;
  }
}

export async function downloadFontsourceVariableVariant(
  item: CatalogEntry,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const slug = item?.id || item?.slug;
  if (!slug || item?.isVariable !== true) return false;
  try {
    const { payload, fontBufferBase64 } = await fetchFontsourceDownloadPayload(
      getFontsourceVariableApiUrl(slug),
    );
    const { ext, blob } = fontsourceBlobFromPayload(payload, fontBufferBase64, slug, { variable: true });
    const fileNameRaw = String(payload?.fileName || `${slug}-variable.woff2`);
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(blob, `${baseName}-variable.${ext}`);
    if (!silent) toast.success(`Скачан Variable ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать Variable ${item?.family || slug}`);
    return false;
  }
}

export async function downloadFontsourcePackageZip(
  item: CatalogEntry,
  { silent = false }: SilentOpts = {},
): Promise<boolean> {
  const slug = item?.id || item?.slug;
  if (!slug) return false;
  try {
    const files = await getFontsourcePackageFiles(item);
    if (files.length === 0) throw new Error('Нет файлов для упаковки');
    const zipBlob = await createZipBlob(files);
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(zipBlob, `${baseName}-package.zip`);
    if (!silent) toast.success(`Скачан пакет ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось собрать пакет ${item?.family || slug}`);
    return false;
  }
}

export {
  downloadFontsharePackageZip,
  downloadFontshareAsFormat,
  downloadFontshareVariableVariant,
  buildFontsharePackageArchiveEntry,
  buildFontshareFormatArchiveEntry,
  fetchFontshareEditorSliceBlob,
} from './fontshareDownloadActions';
