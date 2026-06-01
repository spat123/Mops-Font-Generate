import type { MergedCatalogItem } from '../types/catalog';
import { buildUnifiedLibraryEntry, getCatalogSourceRef } from './unifiedCatalogMerge';
import { buildLibrarySharePayload } from './librarySharePayload';
import { buildAbsoluteLibraryShareUrl, type LibrarySharePayload } from './libraryShareLink';
import type { ShareCatalogItem } from './libraryShareImport';
import type { SavedLibraryRecord } from '../types/editorFonts';

/** Query для `useEditorCatalogDeepLink` из каталога / share. */
export function buildCatalogEditorOpenQuery(
  sourceId: string,
  raw: Record<string, unknown> | null | undefined,
  isVariable = false,
): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  if (sourceId === 'google') {
    const family = String(raw.family || '').trim();
    if (!family) return {};
    return isVariable ? { openGoogle: family, openGoogleVar: '1' } : { openGoogle: family };
  }
  if (sourceId === 'fontsource') {
    const slug = String(raw.id || raw.slug || '').trim();
    if (!slug) return {};
    return isVariable ? { openFontsource: slug, fontsourceVar: '1' } : { openFontsource: slug };
  }
  return {};
}

export function catalogItemSupportsEditorDeepLink(item: MergedCatalogItem | null | undefined): boolean {
  const sourceId = String(item?.primarySource || '').trim();
  return sourceId === 'google' || sourceId === 'fontsource';
}

/** Ссылка share на один шрифт из каталога; при `openInEditor` — авто-открытие в редакторе. */
export async function copyCatalogItemShareLink(
  item: MergedCatalogItem,
  { openInEditor = true }: { openInEditor?: boolean } = {},
): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const entry = buildUnifiedLibraryEntry(item);
  if (!entry) return null;
  const library: SavedLibraryRecord = {
    id: 'catalog-share',
    name: String(item.displayName || entry.label || 'Шрифт').trim() || 'Шрифт',
    fonts: [entry],
  };
  const payload = await buildLibrarySharePayload(library, {});
  let url = await buildAbsoluteLibraryShareUrl(payload);
  if (!url) return null;
  if (openInEditor && catalogItemSupportsEditorDeepLink(item)) {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('autoEditor', '1');
    url = u.toString();
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    return url;
  }
  return url;
}

/** Один Google/Fontsource в share-пейлоаде → query для редактора. */
export function buildShareAutoEditorOpenQueryFromPayload(
  payload: LibrarySharePayload | null | undefined,
): Record<string, string> | null {
  if (!payload) return null;
  const items = Array.isArray(payload.items) ? payload.items : [];
  const catalog = items.filter((row) => {
    if ((row as ShareCatalogItem).kind !== 'catalog-ref') return false;
    const source = String((row as ShareCatalogItem).source || '').toLowerCase();
    return source === 'google' || source === 'fontsource';
  }) as ShareCatalogItem[];
  if (catalog.length !== 1) return null;
  const item = catalog[0];
  const source = String(item.source || '').toLowerCase();
  const key = String(item.key || '').trim();
  if (!key) return null;
  const raw =
    source === 'google'
      ? { family: String(item.family || key) }
      : { id: key, slug: key, family: String(item.family || key) };
  const query = buildCatalogEditorOpenQuery(source, raw, item.isVariable === true);
  if (!query.openGoogle && !query.openFontsource) return null;
  return query;
}

/** Путь редиректа с share сразу в редактор (без отрисовки страницы share). */
export function buildShareAutoEditorRedirectDestination(
  payload: LibrarySharePayload | null | undefined,
): string | null {
  const query = buildShareAutoEditorOpenQueryFromPayload(payload);
  if (!query) return null;
  const params = new URLSearchParams(query);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export function buildCatalogEditorOpenQueryFromItem(
  item: MergedCatalogItem | null | undefined,
): Record<string, string> {
  if (!item) return {};
  const sourceId = String(item.primarySource || '').trim();
  const raw = getCatalogSourceRef(item, sourceId)?.raw || null;
  return buildCatalogEditorOpenQuery(sourceId, raw, Boolean(item.isVariable));
}
