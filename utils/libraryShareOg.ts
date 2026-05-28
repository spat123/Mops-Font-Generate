import { decodeLibrarySharePayloadFromQueryParam } from './libraryShareLinkServer';
import { isShareCatalogItemVariable, type ShareCatalogItem } from './libraryShareImport';
import type { LibrarySharePayload } from './libraryShareLink';

export const SHARE_OG_WIDTH = 1200;
export const SHARE_OG_HEIGHT = 630;
export const SHARE_OG_IMAGE_PATH = '/api/og/share';

export function getShareOgBackgroundPath(): string {
  return '/assets/Open%20Graph/Open%20One.jpg';
};

export type ShareOgDisplayData = {
  total: number;
  staticCount: number;
  variableCount: number;
  fontNames: string[];
  showStatic: boolean;
  showVariable: boolean;
};

/** Статистика и подписи для OG-карточки share. */
export function getShareOgDisplayData(payload: LibrarySharePayload | null | undefined): ShareOgDisplayData {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  let staticCount = 0;
  let variableCount = 0;
  const fontNames: string[] = [];

  items.forEach((item) => {
    const label = String(item?.family || item?.key || '').trim();
    const upper = label.toUpperCase();
    if (upper && !fontNames.includes(upper)) fontNames.push(upper);

    if (item?.kind === 'catalog-ref') {
      if (isShareCatalogItemVariable(item as ShareCatalogItem)) variableCount += 1;
      else staticCount += 1;
      return;
    }
    if (item?.kind === 'cloud-upload-ref') {
      staticCount += 1;
    }
  });

  return {
    total: items.length,
    staticCount,
    variableCount,
    fontNames,
    showStatic: staticCount > 0,
    showVariable: variableCount > 0,
  };
}

export function buildShareOgImageUrl(
  origin: string,
  keys: { shortId?: string; id?: string; shareParam?: string; share?: string } = {},
): string {
  const base = String(origin || '').replace(/\/$/, '');
  const id = String(keys?.shortId || keys?.id || '').trim();
  const shareParam = String(keys?.shareParam || keys?.share || '').trim();
  if (id) return `${base}${SHARE_OG_IMAGE_PATH}?id=${encodeURIComponent(id)}`;
  if (shareParam) return `${base}${SHARE_OG_IMAGE_PATH}?share=${encodeURIComponent(shareParam)}`;
  return `${base}/og.png`;
}

export function decodeShareParamForOg(shareParam: string): LibrarySharePayload | null {
  return decodeLibrarySharePayloadFromQueryParam(shareParam);
}
