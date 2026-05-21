import { decodeLibrarySharePayloadFromQueryParam } from './libraryShareLinkServer';
import { isShareCatalogItemVariable } from './libraryShareImport';

export const SHARE_OG_WIDTH = 1200;
export const SHARE_OG_HEIGHT = 630;
export const SHARE_OG_IMAGE_PATH = '/api/og/share';

/** @param {import('http').IncomingMessage} [req] */
export function getShareOgBackgroundPath() {
  return '/assets/Open%20Graph/Open%20One.jpg';
}

/**
 * Статистика и подписи для OG-карточки share.
 * @param {{ items?: object[] } | null} payload
 */
export function getShareOgDisplayData(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  let staticCount = 0;
  let variableCount = 0;
  const fontNames = [];

  items.forEach((item) => {
    const label = String(item?.family || item?.key || '').trim();
    const upper = label.toUpperCase();
    if (upper && !fontNames.includes(upper)) fontNames.push(upper);

    if (item?.kind === 'catalog-ref') {
      if (isShareCatalogItemVariable(item)) variableCount += 1;
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

/**
 * @param {string} origin
 * @param {{ shortId?: string, shareParam?: string }} [keys]
 */
export function buildShareOgImageUrl(origin, keys = {}) {
  const base = String(origin || '').replace(/\/$/, '');
  const id = String(keys?.shortId || keys?.id || '').trim();
  const shareParam = String(keys?.shareParam || keys?.share || '').trim();
  if (id) return `${base}${SHARE_OG_IMAGE_PATH}?id=${encodeURIComponent(id)}`;
  if (shareParam) return `${base}${SHARE_OG_IMAGE_PATH}?share=${encodeURIComponent(shareParam)}`;
  return `${base}/og.png`;
}

/**
 * @param {string} origin
 * @param {string} shareParam
 */
export function decodeShareParamForOg(shareParam) {
  return decodeLibrarySharePayloadFromQueryParam(shareParam);
}
