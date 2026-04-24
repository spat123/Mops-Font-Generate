import { toast } from './appNotify';
import { buildSafeFileBase } from './fileDownloadUtils';
import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import {
  buildArchiveBlobFromEntries,
  getFontsourcePackageFiles,
  getGooglePackageFiles,
  saveArchiveBlob,
} from './catalogDownloadActions';

function resolveGoogleCatalogEntry(family) {
  const normalized = String(family || '').trim().toLowerCase();
  if (!normalized) return null;
  const list = readGoogleFontCatalogCache();
  return (
    (Array.isArray(list) ? list : []).find(
      (row) => String(row?.family || '').trim().toLowerCase() === normalized,
    ) || null
  );
}

function resolveFontsourceCatalogItem(slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return null;
  const list = readFontsourceCatalogCache();
  return (
    (Array.isArray(list) ? list : []).find(
      (row) =>
        String(row?.id || row?.slug || '')
          .trim()
          .toLowerCase() === normalized,
    ) || null
  );
}

/**
 * Скачать одним ZIP все шрифты из библиотеки.
 * Поддерживает google/fontsource. session/local пропускаются.
 */
export async function downloadLibraryAsZip(library) {
  const libraryName = String(library?.name || 'Библиотека').trim();
  const fonts = Array.isArray(library?.fonts) ? library.fonts : [];
  if (fonts.length === 0) {
    toast.info('В этой библиотеке нет шрифтов');
    return false;
  }

  const safeLibraryBase = buildSafeFileBase(libraryName, 'library');
  const files = [];
  let skipped = 0;

  for (const fontEntry of fonts) {
    const source = String(fontEntry?.source || 'session').trim();

    if (source === 'google') {
      const family = String(fontEntry?.label || '').trim();
      if (!family) {
        skipped += 1;
        continue;
      }
      const cached = resolveGoogleCatalogEntry(family);
      const entry = cached?.family ? cached : { family, subsets: [], isVariable: false };
      try {
        // eslint-disable-next-line no-await-in-loop
        const entries = await getGooglePackageFiles(entry);
        if (entries.length === 0) {
          skipped += 1;
          continue;
        }
        entries.forEach((e) => {
          files.push({ name: `${safeLibraryBase}/${e.name}`, data: e.data });
        });
      } catch {
        skipped += 1;
      }
      continue;
    }

    if (source === 'fontsource') {
      const rawId = String(fontEntry?.id || '').trim();
      const slug = rawId.startsWith('fontsource:') ? rawId.slice('fontsource:'.length) : '';
      if (!slug) {
        skipped += 1;
        continue;
      }
      const cached = resolveFontsourceCatalogItem(slug);
      const item = cached || {
        id: slug,
        slug,
        family: String(fontEntry?.label || slug),
        isVariable: false,
      };
      try {
        // eslint-disable-next-line no-await-in-loop
        const entries = await getFontsourcePackageFiles(item);
        if (entries.length === 0) {
          skipped += 1;
          continue;
        }
        entries.forEach((e) => {
          files.push({ name: `${safeLibraryBase}/${e.name}`, data: e.data });
        });
      } catch {
        skipped += 1;
      }
      continue;
    }

    skipped += 1;
  }

  if (files.length === 0) {
    toast.error('Не удалось собрать архив: нет доступных файлов для скачивания');
    return false;
  }

  const archiveBlob = await buildArchiveBlobFromEntries(files);
  const stamp = new Date().toISOString().slice(0, 10);
  saveArchiveBlob(archiveBlob, `${safeLibraryBase}-${stamp}.zip`);

  toast.success(
    skipped > 0
      ? `Архив библиотеки скачан (пропущено: ${skipped})`
      : 'Архив библиотеки скачан',
  );
  return true;
}

