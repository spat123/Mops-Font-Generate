import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import {
  createCatalogLibraryEntry,
  normalizeLibraryText,
  stampLibraryFontAddedNow,
} from './fontLibraryUtils';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';

export type ShareCatalogItem = {
  kind: 'catalog-ref';
  source?: string;
  key?: string;
  family?: string;
  isVariable?: boolean;
  cascadeSizes?: number[];
};

export type ShareCloudItem = {
  kind: 'cloud-upload-ref';
  key?: string;
  family?: string;
  cascadeSizes?: number[];
};

export type SharePayload = {
  library?: { name?: string };
  items?: Array<ShareCatalogItem | ShareCloudItem | Record<string, unknown>>;
};

export function resolveCatalogIsVariable(source: string, key: string): boolean {
  const k = String(key || '').trim().toLowerCase();
  if (!k) return false;
  if (source === 'google') {
    const list = readGoogleFontCatalogCache();
    const row = (Array.isArray(list) ? list : []).find(
      (r) => String(r?.family || '').trim().toLowerCase() === k,
    );
    return Boolean(row?.isVariable);
  }
  if (source === 'fontsource') {
    const list = readFontsourceCatalogCache();
    const row = (Array.isArray(list) ? list : []).find(
      (r) =>
        String(r?.id || r?.slug || '')
          .trim()
          .toLowerCase() === k,
    );
    return Boolean(row?.isVariable);
  }
  return false;
}

export function isShareCatalogItemVariable(
  shareItem: ShareCatalogItem | null | undefined,
  libraryFont: SavedLibraryFontEntry | null = null,
): boolean {
  if (!shareItem || shareItem.kind !== 'catalog-ref') return false;
  if (typeof shareItem.isVariable === 'boolean') return shareItem.isVariable;
  if (libraryFont?.isVariable === true) return true;
  const source = String(shareItem.source || '').trim().toLowerCase();
  const key = String(shareItem.key || '').trim();
  return resolveCatalogIsVariable(source, key);
}

export function mapShareCatalogItemToLibraryFont(
  item: ShareCatalogItem | null | undefined,
): SavedLibraryFontEntry | null {
  if (!item || item.kind !== 'catalog-ref') return null;
  const source = String(item.source || '').trim().toLowerCase();
  const key = String(item.key || '').trim();
  const family = String(item.family || key).trim();
  if (!source || !key || !family) return null;
  const isVariable =
    typeof item.isVariable === 'boolean' ? item.isVariable : resolveCatalogIsVariable(source, key);
  const entry = createCatalogLibraryEntry({ source, key, label: family, isVariable });
  return entry ? stampLibraryFontAddedNow(entry) : null;
}

export function libraryDraftFromSharePayload(payload: SharePayload | null | undefined): {
  name: string;
  fonts: SavedLibraryFontEntry[];
} {
  const name = normalizeLibraryText(payload?.library?.name) || 'Общая библиотека';
  const fonts = (Array.isArray(payload?.items) ? payload.items : [])
    .map((it) => mapShareCatalogItemToLibraryFont(it as ShareCatalogItem))
    .filter((entry): entry is SavedLibraryFontEntry => entry != null);
  return { name, fonts };
}

export function payloadHasAnyCascadeSizes(payload: SharePayload | null | undefined): boolean {
  return (Array.isArray(payload?.items) ? payload.items : []).some(
    (i) => Array.isArray((i as ShareCatalogItem).cascadeSizes) && (i as ShareCatalogItem).cascadeSizes!.length > 0,
  );
}

export type ShareViewRow = {
  rowKey: string;
  kind: string;
  catalogSource: 'google' | 'fontsource' | null;
  shareItem: ShareCatalogItem | ShareCloudItem;
  title: string;
  sourceLabel: string;
  cascadeSizes: number[];
  canDownload: boolean;
  canImport: boolean;
  libraryFont: SavedLibraryFontEntry | null;
};

export function buildShareViewRows(payload: SharePayload | null | undefined): ShareViewRow[] {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map((item, index) => {
      if ((item as ShareCatalogItem).kind === 'catalog-ref') {
        const catalogItem = item as ShareCatalogItem;
        const lf = mapShareCatalogItemToLibraryFont(catalogItem);
        const source = String(catalogItem.source || '').toLowerCase();
        return {
          rowKey: `cat-${catalogItem.source}-${catalogItem.key}-${index}`,
          kind: 'catalog-ref',
          catalogSource:
            source === 'google' ? ('google' as const) : source === 'fontsource' ? ('fontsource' as const) : null,
          shareItem: catalogItem,
          title: String(catalogItem.family || catalogItem.key || '').trim() || 'Шрифт',
          sourceLabel:
            source === 'google' ? 'Google Fonts' : source === 'fontsource' ? 'Fontsource' : source,
          cascadeSizes: Array.isArray(catalogItem.cascadeSizes)
            ? catalogItem.cascadeSizes
                .map((n) => Number(n))
                .filter((n) => Number.isFinite(n) && n > 0)
            : [],
          canDownload: true,
          canImport: Boolean(lf),
          libraryFont: lf,
        };
      }
      if ((item as ShareCloudItem).kind === 'cloud-upload-ref') {
        const cloudItem = item as ShareCloudItem;
        return {
          rowKey: `cloud-${cloudItem.key}-${index}`,
          kind: 'cloud-upload-ref',
          catalogSource: null,
          shareItem: cloudItem,
          title: String(cloudItem.family || 'Локальный файл').trim() || 'Локальный файл',
          sourceLabel: 'Локальный файл',
          cascadeSizes: Array.isArray(cloudItem.cascadeSizes)
            ? cloudItem.cascadeSizes
                .map((n) => Number(n))
                .filter((n) => Number.isFinite(n) && n > 0)
            : [],
          canDownload: false,
          canImport: false,
          libraryFont: null,
        };
      }
      return null;
    })
    .filter((row) => row != null) as ShareViewRow[];
}
