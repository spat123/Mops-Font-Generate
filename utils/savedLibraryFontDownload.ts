import { toast } from './appNotify';
import {
  buildFontsourceFormatArchiveEntry,
  buildFontsourcePackageArchiveEntry,
  buildGoogleFormatArchiveEntry,
  buildGooglePackageArchiveEntry,
  buildSelectionArchiveEntries,
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
  downloadFontshareAsFormat,
  downloadFontsharePackageZip,
  downloadFontshareVariableVariant,
  buildArchiveBlobFromEntries,
  saveArchiveBlob,
} from './catalogDownloadActions';
import { convertBlobToFormat } from './fontFormatConvertClient';
import { buildSafeFileBase, saveBlobAsFile } from './fileDownloadUtils';
import { buildLocalStylePickerProps } from './fontDownloadStylePicker';
import { buildCatalogDownloadButtonProps } from '../components/catalog/buildCatalogDownloadButtonProps';
import { buildCatalogTrialDownloadProps } from '../components/catalog/buildCatalogSourceDownloadProps';
import { isCatalogExternalDownloadButtonProps } from '../components/catalog/catalogExternalDownload';
import {
  parseFontfabricTrialEntrySlug,
  parseFontshareEntrySlug,
  parseFontsourceEntrySlug,
  parseGoogleEntryFamily,
  resolveFontfabricTrialCatalogItem,
  resolveFontshareCatalogItem,
  resolveFontsourceCatalogItem,
  resolveGoogleCatalogEntry,
} from './catalogCacheLookup';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';
import type { SessionFontRecord } from '../types/editorFonts';
import type { CatalogDownloadButtonProps } from '../types/catalog';

const LOCAL_DOWNLOAD_FORMATS = ['ttf', 'otf', 'woff', 'woff2'] as const;

type LocalDownloadFormat = (typeof LOCAL_DOWNLOAD_FORMATS)[number];

export type SavedLibraryDownloadSplitButtonProps = CatalogDownloadButtonProps & {
  disabled?: boolean;
  tone?: 'light' | 'accent';
  layout?: 'compact' | 'comfortable';
  className?: string;
};

const SAVED_LIBRARY_DOWNLOAD_CHROME = {
  tone: 'light' as const,
  layout: 'comfortable' as const,
  className: '!w-auto max-w-[min(100%,12rem)]',
};

function normalizeLocalFormat(fileName: unknown, fallback: LocalDownloadFormat = 'woff2'): LocalDownloadFormat {
  const ext = String(fileName || '')
    .trim()
    .split('.')
    .pop()
    ?.toLowerCase();
  return LOCAL_DOWNLOAD_FORMATS.includes(ext as LocalDownloadFormat)
    ? (ext as LocalDownloadFormat)
    : fallback;
}

async function downloadLocalAsFormat({
  blob,
  fileBase,
  sourceFormat,
  targetFormat,
  label,
}: {
  blob: Blob;
  fileBase: string;
  sourceFormat: LocalDownloadFormat;
  targetFormat: string;
  label: string;
}) {
  const outFormat = String(targetFormat || sourceFormat || 'woff2').toLowerCase();
  const outBlob = outFormat === sourceFormat ? blob : await convertBlobToFormat(blob, outFormat);
  saveBlobAsFile(outBlob, `${fileBase}.${outFormat}`);
  toast.success(`Скачан ${label} (${outFormat.toUpperCase()})`);
}

function wrapSavedLibraryDownloadProps(
  download: CatalogDownloadButtonProps,
  {
    disabled = false,
    onDisabledClick,
  }: { disabled?: boolean; onDisabledClick?: () => void } = {},
): SavedLibraryDownloadSplitButtonProps {
  if (disabled) {
    return {
      ...SAVED_LIBRARY_DOWNLOAD_CHROME,
      disabled: true,
      primaryLabel: 'Скачать',
      primaryAriaLabel: download.primaryAriaLabel,
      onPrimaryClick: onDisabledClick,
      menuItems: [],
    };
  }
  const external = isCatalogExternalDownloadButtonProps(download);
  return {
    ...SAVED_LIBRARY_DOWNLOAD_CHROME,
    ...download,
    className: external
      ? '!w-auto !max-w-none shrink-0'
      : SAVED_LIBRARY_DOWNLOAD_CHROME.className,
  };
}

/**
 * Пропсы для CatalogDownloadSplitButton на карточке записи сохранённой библиотеки.
 * null — кнопку не показывать (локальный / сессия и т.п.)
 */
export function buildSavedLibraryDownloadSplitButtonProps(
  fontEntry: SavedLibraryFontEntry | null | undefined,
  sessionFont: SessionFontRecord | null = null,
): SavedLibraryDownloadSplitButtonProps | null {
  if (!fontEntry || typeof fontEntry !== 'object') return null;
  const source = String(fontEntry.source || 'session').trim();
  const label = String(fontEntry.label || '').trim();
  const id = String(fontEntry.id || '').trim();

  if (source === 'google') {
    const family =
      parseGoogleEntryFamily(id) ||
      String(label || '')
        .trim()
        .replace(/\s+\d+$/i, '')
        .trim();
    const entry = resolveGoogleCatalogEntry(family);
    if (!entry?.family) {
      return wrapSavedLibraryDownloadProps(
        {
          primaryLabel: 'Скачать',
          primaryAriaLabel: `Скачать ${family}`,
          onPrimaryClick: () => {},
          menuItems: [],
        },
        {
          disabled: true,
          onDisabledClick: () =>
            toast.info('Загрузите каталог Google Fonts, чтобы скачать этот шрифт из кэша'),
        },
      );
    }
    const name = String(entry.family);
    return wrapSavedLibraryDownloadProps(
      buildCatalogDownloadButtonProps({
        family: name,
        item: entry,
        catalogEntry: entry,
        catalogSource: 'google',
        showVariable: entry.isVariable === true,
        onDownloadZip: downloadGooglePackageZip,
        onDownloadAsFormat: downloadGoogleAsFormat,
        onDownloadVariableVariant: downloadGoogleVariableVariant,
      }),
    );
  }

  if (source === 'fontsource') {
    const slug = parseFontsourceEntrySlug(id);
    if (!slug) return null;
    const item = resolveFontsourceCatalogItem(slug);
    if (!item) {
      return wrapSavedLibraryDownloadProps(
        {
          primaryLabel: 'Скачать',
          primaryAriaLabel: `Скачать ${label || slug}`,
          onPrimaryClick: () => {},
          menuItems: [],
        },
        {
          disabled: true,
          onDisabledClick: () =>
            toast.info('Загрузите каталог Fontsource, чтобы скачать этот шрифт из кэша'),
        },
      );
    }
    const display = String(item.family || label || slug);
    return wrapSavedLibraryDownloadProps(
      buildCatalogDownloadButtonProps({
        family: display,
        item,
        catalogEntry: item,
        catalogSource: 'fontsource',
        showVariable: item.isVariable === true,
        onDownloadZip: downloadFontsourcePackageZip,
        onDownloadAsFormat: downloadFontsourceAsFormat,
        onDownloadVariableVariant: downloadFontsourceVariableVariant,
      }),
    );
  }

  if (source === 'fontshare') {
    const slug = parseFontshareEntrySlug(id);
    if (!slug) return null;
    const item =
      resolveFontshareCatalogItem(slug) ||
      ({
        id: slug,
        slug,
        family: label || slug,
        pageUrl: `https://www.fontshare.com/fonts/${encodeURIComponent(slug)}`,
      } as Record<string, unknown>);
    const display = String(item.family || label || slug);
    return wrapSavedLibraryDownloadProps(
      buildCatalogDownloadButtonProps({
        family: display,
        item,
        catalogEntry: item,
        catalogSource: 'fontshare',
        showVariable: item.isVariable === true,
        onDownloadZip: downloadFontsharePackageZip,
        onDownloadAsFormat: downloadFontshareAsFormat,
        onDownloadVariableVariant: downloadFontshareVariableVariant,
      }),
    );
  }

  if (source === 'fontfabric-trial') {
    const slug = parseFontfabricTrialEntrySlug(id);
    if (!slug) return null;
    const raw =
      resolveFontfabricTrialCatalogItem(slug) ||
      ({
        slug,
        family: label || slug,
        trialUrl: `https://www.fontfabric.com/fonts/${encodeURIComponent(slug)}/`,
      } as Record<string, unknown>);
    const display = String(raw.family || label || slug);
    return wrapSavedLibraryDownloadProps(
      buildCatalogTrialDownloadProps({
        displayName: display,
        raw,
        onOpenTrialPage: (trialRaw) => {
          const url = String(trialRaw?.trialUrl || trialRaw?.link || '').trim();
          if (typeof window !== 'undefined' && url) {
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        },
      }),
    );
  }

  if (source === 'local') {
    const fileBlob = sessionFont?.file instanceof Blob ? sessionFont.file : null;
    const originalName =
      String(sessionFont?.originalName || '').trim() ||
      String(sessionFont?.name || '').trim() ||
      `${label || 'font'}.woff2`;
    const sourceFormat = normalizeLocalFormat(originalName);
    const fileBase = buildSafeFileBase(label || originalName, 'local-font');

    if (!fileBlob) {
      return wrapSavedLibraryDownloadProps(
        {
          primaryLabel: 'Скачать',
          primaryAriaLabel: `Скачать ${label || 'локальный шрифт'}`,
          onPrimaryClick: () => {},
          menuItems: [],
        },
        {
          disabled: true,
          onDisabledClick: () =>
            toast.info('Откройте локальный шрифт в редакторе, чтобы скачать исходный файл'),
        },
      );
    }

    return wrapSavedLibraryDownloadProps({
      primaryLabel: 'Скачать',
      primaryAriaLabel: `Скачать ${label || originalName}`,
      onPrimaryClick: () => {
        saveBlobAsFile(fileBlob, originalName);
        toast.success(`Скачан ${label || originalName}`);
      },
      stylePicker: buildLocalStylePickerProps(sessionFont, label || originalName) as CatalogDownloadButtonProps['stylePicker'],
      menuItems: [
        {
          key: 'original',
          label: `Оригинал (${sourceFormat.toUpperCase()})`,
          onSelect: () => {
            saveBlobAsFile(fileBlob, originalName);
            toast.success(`Скачан ${label || originalName}`);
          },
        },
        ...LOCAL_DOWNLOAD_FORMATS.filter((format) => format !== sourceFormat).map((format) => ({
          key: format,
          label: format.toUpperCase(),
          onSelect: async () => {
            try {
              await downloadLocalAsFormat({
                blob: fileBlob,
                fileBase,
                sourceFormat,
                targetFormat: format,
                label: label || originalName,
              });
            } catch {
              toast.error(
                `Не удалось конвертировать ${label || originalName} в ${format.toUpperCase()}`,
              );
            }
          },
        })),
      ],
    });
  }

  return null;
}

type SavedLibraryDownloadTarget =
  | { source: 'google'; entry: Record<string, unknown>; label: string }
  | { source: 'fontsource'; item: Record<string, unknown>; label: string };

function resolveSavedLibraryDownloadTarget(
  fontEntry: SavedLibraryFontEntry | null | undefined,
): SavedLibraryDownloadTarget | null {
  if (!fontEntry || typeof fontEntry !== 'object') return null;
  const source = String(fontEntry.source || 'session').trim();
  const label = String(fontEntry.label || '').trim();
  const id = String(fontEntry.id || '').trim();

  if (source === 'google') {
    const family =
      parseGoogleEntryFamily(id) ||
      String(label || '')
        .trim()
        .replace(/\s+\d+$/i, '')
        .trim();
    if (!family) return null;
    const entry = resolveGoogleCatalogEntry(family) || { family, subsets: [], isVariable: false };
    return { source: 'google', entry, label: family };
  }

  if (source === 'fontsource') {
    const slug = parseFontsourceEntrySlug(id);
    if (!slug) return null;
    const item = resolveFontsourceCatalogItem(slug) || {
      id: slug,
      slug,
      family: label || slug,
      isVariable: false,
    };
    return { source: 'fontsource', item, label: String(item.family || label || slug) };
  }

  return null;
}

export function countDownloadableSavedLibraryFonts(
  fontEntries: SavedLibraryFontEntry[] | null | undefined,
): number {
  return (Array.isArray(fontEntries) ? fontEntries : []).reduce((count, entry) => {
    const source = String(entry?.source || '').trim();
    return source === 'google' || source === 'fontsource' ? count + 1 : count;
  }, 0);
}

export async function downloadSelectedSavedLibraryFonts(
  fontEntries: SavedLibraryFontEntry[] | null | undefined,
): Promise<boolean> {
  const selected = (Array.isArray(fontEntries) ? fontEntries : [])
    .map(resolveSavedLibraryDownloadTarget)
    .filter((target): target is SavedLibraryDownloadTarget => target != null);
  if (selected.length === 0) {
    toast.info('Среди выделенных нет шрифтов, доступных для скачивания');
    return false;
  }
  if (selected.length > 1) {
    const files = await buildSelectionArchiveEntries(selected, (target) =>
      target.source === 'google'
        ? buildGooglePackageArchiveEntry(target.entry)
        : buildFontsourcePackageArchiveEntry(target.item),
    );
    if (files.length === 0) {
      toast.error('Не удалось собрать архив выделенных шрифтов');
      return false;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const archiveBlob = await buildArchiveBlobFromEntries(files);
    saveArchiveBlob(archiveBlob, `library-selected-${stamp}.zip`);
    toast.success(
      files.length === 1 ? 'Скачан 1 шрифт в архиве' : `Скачано ${files.length} шрифтов в одном архиве`,
    );
    return true;
  }

  const [target] = selected;
  const ok =
    target.source === 'google'
      ? await downloadGooglePackageZip(target.entry, { silent: true })
      : await downloadFontsourcePackageZip(target.item, { silent: true });
  if (ok) {
    toast.success(`Скачан ${target.label}`);
  }
  return ok;
}

export async function downloadSelectedSavedLibraryFontsAsFormat(
  fontEntries: SavedLibraryFontEntry[] | null | undefined,
  format: string,
): Promise<boolean> {
  const selected = (Array.isArray(fontEntries) ? fontEntries : [])
    .map(resolveSavedLibraryDownloadTarget)
    .filter((target): target is SavedLibraryDownloadTarget => target != null);
  if (selected.length === 0) {
    toast.info('Среди выделенных нет шрифтов, доступных для скачивания');
    return false;
  }
  const targetFormat = String(format || 'woff2').toLowerCase();
  if (selected.length > 1) {
    const files = await buildSelectionArchiveEntries(selected, (target) =>
      target.source === 'google'
        ? buildGoogleFormatArchiveEntry(target.entry, targetFormat)
        : buildFontsourceFormatArchiveEntry(target.item, targetFormat),
    );
    if (files.length === 0) {
      toast.error(`Не удалось собрать архив ${targetFormat.toUpperCase()}`);
      return false;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const archiveBlob = await buildArchiveBlobFromEntries(files);
    saveArchiveBlob(archiveBlob, `library-selected-${targetFormat}-${stamp}.zip`);
    toast.success(
      files.length === 1
        ? `Скачан 1 шрифт (${targetFormat.toUpperCase()}) в архиве`
        : `Скачано ${files.length} шрифтов (${targetFormat.toUpperCase()}) в одном архиве`,
    );
    return true;
  }

  const [target] = selected;
  const ok =
    target.source === 'google'
      ? await downloadGoogleAsFormat(target.entry, targetFormat, { silent: true })
      : await downloadFontsourceAsFormat(target.item, targetFormat, { silent: true });
  if (ok) {
    toast.success(`Скачан ${target.label} (${targetFormat.toUpperCase()})`);
  }
  return ok;
}
