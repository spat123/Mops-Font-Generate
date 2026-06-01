import { toast } from './appNotify';
import { buildSafeFileBase } from './fileDownloadUtils';
import {
  parseGoogleEntryFamily,
  parseFontsourceEntrySlug,
  resolveFontsourceCatalogItem,
  resolveGoogleCatalogEntry,
} from './catalogCacheLookup';
import { resolvePreferredLibraryPickerEntry } from './libraryPickerCatalogSearch';
import {
  buildArchiveBlobFromEntries,
  getFontsourcePackageFiles,
  getGooglePackageFiles,
  saveArchiveBlob,
} from './catalogDownloadActions';
import type { SavedLibraryRecord } from '../types/editorFonts';

type ArchiveFileEntry = { name: string; data: Blob };

function entryDataToBlob(data: Blob | ArrayBuffer): Blob {
  return data instanceof Blob ? data : new Blob([new Uint8Array(data)]);
}

/** Скачать одним ZIP все шрифты из библиотеки. Поддерживает google/fontsource. session/local пропускаются. */
export async function downloadLibraryAsZip(library: SavedLibraryRecord | null | undefined): Promise<boolean> {
  const libraryName = String(library?.name || 'Библиотека').trim();
  const fonts = Array.isArray(library?.fonts) ? library.fonts : [];
  if (fonts.length === 0) {
    toast.info('В этой библиотеке нет шрифтов');
    return false;
  }

  const safeLibraryBase = buildSafeFileBase(libraryName, 'library');
  const files: ArchiveFileEntry[] = [];
  let skipped = 0;

  for (const fontEntry of fonts) {
    const preferredEntry = resolvePreferredLibraryPickerEntry(fontEntry) || fontEntry;
    const source = String(preferredEntry?.source || 'session').trim();

    if (source === 'google') {
      const family =
        parseGoogleEntryFamily(String(preferredEntry?.id || '')) ||
        String(preferredEntry?.label || '')
          .trim()
          .replace(/\s+\d+$/i, '')
          .trim();
      if (!family) {
        skipped += 1;
        continue;
      }
      const cached = resolveGoogleCatalogEntry(family);
      const entry = cached?.family ? cached : { family, subsets: [], isVariable: false };
      try {
        const entries = await getGooglePackageFiles(entry);
        if (entries.length === 0) {
          skipped += 1;
          continue;
        }
        entries.forEach((e) => {
          files.push({ name: `${safeLibraryBase}/${e.name}`, data: entryDataToBlob(e.data) });
        });
      } catch {
        skipped += 1;
      }
      continue;
    }

    if (source === 'fontsource') {
      const slug = parseFontsourceEntrySlug(String(preferredEntry?.id || ''));
      if (!slug) {
        skipped += 1;
        continue;
      }
      const cached = resolveFontsourceCatalogItem(slug);
      const item = cached || {
        id: slug,
        slug,
        family: String(preferredEntry?.label || slug),
        isVariable: false,
      };
      try {
        const entries = await getFontsourcePackageFiles(item);
        if (entries.length === 0) {
          skipped += 1;
          continue;
        }
        entries.forEach((e) => {
          files.push({ name: `${safeLibraryBase}/${e.name}`, data: entryDataToBlob(e.data) });
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
