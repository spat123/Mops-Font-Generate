import { toast } from './appNotify';
import { saveBlobAsFile, buildSafeFileBase } from './fileDownloadUtils';
import { pickFontsharePreviewStyle, type FontshareCatalogItem } from './fontshareCatalogNormalize';

type FontshareDownloadItem = Pick<
  FontshareCatalogItem,
  'slug' | 'id' | 'family' | 'canRedistribute' | 'licenseType' | 'pageUrl' | 'downloadUrl'
> &
  Record<string, unknown>;

function fontshareCanDownloadFiles(item: FontshareDownloadItem | null | undefined): boolean {
  return item?.canRedistribute === true || item?.licenseType === 'sil_ofl';
}

export function openFontshareExternalDownload(
  item: FontshareDownloadItem | null | undefined,
  { silent = false }: { silent?: boolean } = {},
): boolean {
  if (typeof window === 'undefined') return false;
  const slug = item?.slug || item?.id;
  const url = item?.pageUrl || (slug ? `https://www.fontshare.com/fonts/${encodeURIComponent(slug)}` : '');
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  if (!silent) {
    toast.info('Скачивание — на сайте Fontshare');
  }
  return true;
}

export async function downloadFontsharePackageZip(
  item: FontshareDownloadItem | null | undefined,
  { silent = false }: { silent?: boolean } = {},
): Promise<boolean> {
  const slug = item?.slug || item?.id;
  if (!slug) return false;
  if (!fontshareCanDownloadFiles(item)) {
    return openFontshareExternalDownload(item, { silent });
  }
  try {
    const url = item?.downloadUrl || `https://api.fontshare.com/v2/fonts/download/${encodeURIComponent(slug)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    saveBlobAsFile(blob, `${baseName}-fontshare.zip`);
    if (!silent) toast.success(`Скачан пакет ${item?.family || slug}`);
    return true;
  } catch {
    if (!silent) toast.error(`Не удалось скачать ${item?.family || slug}`);
    return false;
  }
}

export async function downloadFontshareAsFormat(
  item: FontshareDownloadItem | null | undefined,
  _format: string,
  options: { silent?: boolean } = {},
): Promise<boolean> {
  return downloadFontsharePackageZip(item, options);
}

export async function downloadFontshareVariableVariant(
  item: FontshareDownloadItem | null | undefined,
  options: { silent?: boolean } = {},
): Promise<boolean> {
  return downloadFontsharePackageZip(item, options);
}

export type ArchiveEntry = { name: string; data: Blob };

export async function buildFontsharePackageArchiveEntry(
  item: FontshareDownloadItem | null | undefined,
): Promise<ArchiveEntry | null> {
  if (!fontshareCanDownloadFiles(item)) return null;
  const slug = item?.slug || item?.id;
  if (!slug) return null;
  try {
    const url = item?.downloadUrl || `https://api.fontshare.com/v2/fonts/download/${encodeURIComponent(slug)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    const baseName = buildSafeFileBase(item?.family || slug, slug);
    return { name: `${baseName}-fontshare.zip`, data: new Blob([data], { type: 'application/zip' }) };
  } catch {
    return null;
  }
}

export async function buildFontshareFormatArchiveEntry(
  item: FontshareDownloadItem | null | undefined,
  _format?: string,
): Promise<ArchiveEntry | null> {
  return buildFontsharePackageArchiveEntry(item);
}

export type FontshareEditorSlice = {
  blob: Blob;
  name: string;
  weight: number;
  style: 'normal' | 'italic';
};

/** Загрузить woff2 для открытия в редакторе. */
export async function fetchFontshareEditorSliceBlob(
  item: FontshareCatalogItem | Record<string, unknown> | null | undefined,
): Promise<FontshareEditorSlice | null> {
  const styleRow = pickFontsharePreviewStyle(item as { styleRows?: FontshareCatalogItem['styleRows'] });
  const fileUrl = styleRow?.file;
  if (!fileUrl) return null;
  const res = await fetch(fileUrl);
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob?.size) return null;
  const family =
    (item as FontshareCatalogItem)?.family || (item as { slug?: string })?.slug || 'fontshare-font';
  return {
    blob,
    name: `${family}.woff2`,
    weight: styleRow.weight,
    style: styleRow.isItalic ? 'italic' : 'normal',
  };
}
