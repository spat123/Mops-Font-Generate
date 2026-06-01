import type { MergedCatalogItem } from '../types/catalog';
import { buildUnifiedLibraryEntry, getCatalogSourceRef } from './unifiedCatalogMerge';
import { buildLibrarySharePayload } from './librarySharePayload';
import { buildAbsoluteLibraryShareUrl } from './libraryShareLink';
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

export function buildCatalogEditorOpenQueryFromItem(
  item: MergedCatalogItem | null | undefined,
): Record<string, string> {
  if (!item) return {};
  const sourceId = String(item.primarySource || '').trim();
  const raw = getCatalogSourceRef(item, sourceId)?.raw || null;
  return buildCatalogEditorOpenQuery(sourceId, raw, Boolean(item.isVariable));
}
