import { toast } from './appNotify';
import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
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
  buildArchiveBlobFromEntries,
  saveArchiveBlob,
} from './catalogDownloadActions';

/**
 * Пропсы для {@link CatalogDownloadSplitButton} на карточке записи сохранённой библиотеки.
 * @returns {object | null} null — кнопку не показывать (локальный / сессия и т.п.)
 */
export function buildSavedLibraryDownloadSplitButtonProps(fontEntry) {
  if (!fontEntry || typeof fontEntry !== 'object') return null;
  const source = String(fontEntry.source || 'session').trim();
  const label = String(fontEntry.label || '').trim();
  const id = String(fontEntry.id || '').trim();

  if (source === 'google') {
    const family = label;
    const entry =
      readGoogleFontCatalogCache().find(
        (item) => String(item?.family || '').trim().toLowerCase() === family.toLowerCase(),
      ) || null;
    if (!entry?.family) {
      return {
        disabled: true,
        tone: 'light',
        layout: 'comfortable',
        className: '!w-auto max-w-[min(100%,12rem)]',
        primaryLabel: 'Скачать',
        primaryAriaLabel: `Скачать ${family}`,
        onPrimaryClick: () =>
          toast.info('Загрузите каталог Google Fonts, чтобы скачать этот шрифт из кэша'),
        menuItems: [],
      };
    }
    const name = entry.family;
    return {
      tone: 'light',
      layout: 'comfortable',
      className: '!w-auto max-w-[min(100%,12rem)]',
      primaryLabel: 'Скачать',
      primaryAriaLabel: `Скачать ${name}`,
      onPrimaryClick: () => downloadGooglePackageZip(entry),
      menuItems: [
        { key: 'zip', label: 'ZIP (по умолчанию)', onSelect: () => downloadGooglePackageZip(entry) },
        { key: 'ttf', label: 'TTF', onSelect: () => downloadGoogleAsFormat(entry, 'ttf') },
        { key: 'otf', label: 'OTF', onSelect: () => downloadGoogleAsFormat(entry, 'otf') },
        { key: 'woff', label: 'WOFF', onSelect: () => downloadGoogleAsFormat(entry, 'woff') },
        { key: 'woff2', label: 'WOFF2', onSelect: () => downloadGoogleAsFormat(entry, 'woff2') },
        {
          key: 'variable',
          label: 'Variable вариант',
          hidden: entry.isVariable !== true,
          onSelect: () => downloadGoogleVariableVariant(entry),
        },
      ],
    };
  }

  if (source === 'fontsource') {
    const slug = id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
    if (!slug) return null;
    const list = readFontsourceCatalogCache();
    const item =
      (Array.isArray(list) ? list : []).find(
        (row) =>
          String(row?.id || row?.slug || '')
            .trim()
            .toLowerCase() === slug.toLowerCase(),
      ) || null;
    if (!item) {
      return {
        disabled: true,
        tone: 'light',
        layout: 'comfortable',
        className: '!w-auto max-w-[min(100%,12rem)]',
        primaryLabel: 'Скачать',
        primaryAriaLabel: `Скачать ${label || slug}`,
        onPrimaryClick: () =>
          toast.info('Загрузите каталог Fontsource, чтобы скачать этот шрифт из кэша'),
        menuItems: [],
      };
    }
    const display = item.family || label || slug;
    return {
      tone: 'light',
      layout: 'comfortable',
      className: '!w-auto max-w-[min(100%,12rem)]',
      primaryLabel: 'Скачать',
      primaryAriaLabel: `Скачать ${display}`,
      onPrimaryClick: () => downloadFontsourcePackageZip(item),
      menuItems: [
        { key: 'zip', label: 'ZIP (по умолчанию)', onSelect: () => downloadFontsourcePackageZip(item) },
        { key: 'ttf', label: 'TTF', onSelect: () => downloadFontsourceAsFormat(item, 'ttf') },
        { key: 'otf', label: 'OTF', onSelect: () => downloadFontsourceAsFormat(item, 'otf') },
        { key: 'woff', label: 'WOFF', onSelect: () => downloadFontsourceAsFormat(item, 'woff') },
        { key: 'woff2', label: 'WOFF2', onSelect: () => downloadFontsourceAsFormat(item, 'woff2') },
        {
          key: 'variable',
          label: 'Variable вариант',
          hidden: item.isVariable !== true,
          onSelect: () => downloadFontsourceVariableVariant(item),
        },
      ],
    };
  }

  return null;
}

function resolveSavedLibraryDownloadTarget(fontEntry) {
  if (!fontEntry || typeof fontEntry !== 'object') return null;
  const source = String(fontEntry.source || 'session').trim();
  const label = String(fontEntry.label || '').trim();
  const id = String(fontEntry.id || '').trim();

  if (source === 'google') {
    const family = label;
    if (!family) return null;
    const entry =
      readGoogleFontCatalogCache().find(
        (item) => String(item?.family || '').trim().toLowerCase() === family.toLowerCase(),
      ) || { family, subsets: [], isVariable: false };
    return { source: 'google', entry, label: family };
  }

  if (source === 'fontsource') {
    const slug = id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
    if (!slug) return null;
    const list = readFontsourceCatalogCache();
    const item =
      (Array.isArray(list) ? list : []).find(
        (row) =>
          String(row?.id || row?.slug || '')
            .trim()
            .toLowerCase() === slug.toLowerCase(),
      ) || {
        id: slug,
        slug,
        family: label || slug,
        isVariable: false,
      };
    return { source: 'fontsource', item, label: item.family || label || slug };
  }

  return null;
}

export function countDownloadableSavedLibraryFonts(fontEntries) {
  return (Array.isArray(fontEntries) ? fontEntries : []).reduce((count, entry) => {
    const source = String(entry?.source || '').trim();
    return source === 'google' || source === 'fontsource' ? count + 1 : count;
  }, 0);
}

export async function downloadSelectedSavedLibraryFonts(fontEntries) {
  const selected = (Array.isArray(fontEntries) ? fontEntries : [])
    .map(resolveSavedLibraryDownloadTarget)
    .filter(Boolean);
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

export async function downloadSelectedSavedLibraryFontsAsFormat(fontEntries, format) {
  const selected = (Array.isArray(fontEntries) ? fontEntries : [])
    .map(resolveSavedLibraryDownloadTarget)
    .filter(Boolean);
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
