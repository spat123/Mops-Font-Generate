import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import {
  createCatalogLibraryEntry,
  normalizeLibraryText,
  stampLibraryFontAddedNow,
} from './fontLibraryUtils';

export function resolveCatalogIsVariable(source, key) {
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

/** VF / статика для пункта `catalog-ref` в share (пейлоад + кэш каталога). */
export function isShareCatalogItemVariable(shareItem, libraryFont = null) {
  if (!shareItem || shareItem.kind !== 'catalog-ref') return false;
  if (typeof shareItem.isVariable === 'boolean') return shareItem.isVariable;
  if (libraryFont?.isVariable === true) return true;
  const source = String(shareItem.source || '').trim().toLowerCase();
  const key = String(shareItem.key || '').trim();
  return resolveCatalogIsVariable(source, key);
}

/**
 * Элемент каталога из пейлоада «Поделиться» → запись библиотеки (Google / Fontsource).
 */
export function mapShareCatalogItemToLibraryFont(item) {
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

/** Имя + шрифты, которые можно сохранить в «Мои библиотеки» (только catalog-ref). */
export function libraryDraftFromSharePayload(payload) {
  const name = normalizeLibraryText(payload?.library?.name) || 'Общая библиотека';
  const fonts = (Array.isArray(payload?.items) ? payload.items : [])
    .map((it) => mapShareCatalogItemToLibraryFont(it))
    .filter(Boolean);
  return { name, fonts };
}

export function payloadHasAnyCascadeSizes(payload) {
  return (Array.isArray(payload?.items) ? payload.items : []).some(
    (i) => Array.isArray(i?.cascadeSizes) && i.cascadeSizes.length > 0,
  );
}

/**
 * Строки для UI страницы шаринга (список / сетка).
 * @returns {Array<{
 *   rowKey: string,
 *   kind: string,
 *   title: string,
 *   sourceLabel: string,
 *   cascadeSizes: number[],
 *   canDownload: boolean,
 *   canImport: boolean,
 *   libraryFont: object | null,
 * }>}
 */
export function buildShareViewRows(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items
    .map((item, index) => {
      if (item.kind === 'catalog-ref') {
        const lf = mapShareCatalogItemToLibraryFont(item);
        const source = String(item.source || '').toLowerCase();
        return {
          rowKey: `cat-${item.source}-${item.key}-${index}`,
          kind: 'catalog-ref',
          catalogSource: source === 'google' ? 'google' : source === 'fontsource' ? 'fontsource' : null,
          shareItem: item,
          title: String(item.family || item.key || '').trim() || 'Шрифт',
          sourceLabel: source === 'google' ? 'Google Fonts' : source === 'fontsource' ? 'Fontsource' : source,
          cascadeSizes: Array.isArray(item.cascadeSizes)
            ? item.cascadeSizes.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
            : [],
          canDownload: true,
          canImport: Boolean(lf),
          libraryFont: lf,
        };
      }
      if (item.kind === 'cloud-upload-ref') {
        return {
          rowKey: `cloud-${item.key}-${index}`,
          kind: 'cloud-upload-ref',
          catalogSource: null,
          shareItem: item,
          title: String(item.family || 'Локальный файл').trim() || 'Локальный файл',
          sourceLabel: 'Локальный файл',
          cascadeSizes: Array.isArray(item.cascadeSizes)
            ? item.cascadeSizes.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
            : [],
          canDownload: false,
          canImport: false,
          libraryFont: null,
        };
      }
      return null;
    })
    .filter(Boolean);
}
