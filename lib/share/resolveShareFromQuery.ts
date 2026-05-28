import { decodeLibrarySharePayloadFromQueryParam } from '../../utils/libraryShareLinkServer';
import { getShareLinkPayloadById } from './shareLinkStore';

/**
 * @param {{ id?: string, share?: string }} query
 * @returns {Promise<{ payload: object | null, shortId: string | null, legacyShareParam: string | null }>}
 */
export async function resolveShareFromQuery(query) {
  const shortId = typeof query?.id === 'string' ? query.id.trim() : '';
  const legacyShareParam = typeof query?.share === 'string' ? query.share.trim() : '';

  if (shortId) {
    const payload = await getShareLinkPayloadById(shortId);
    return { payload, shortId, legacyShareParam: null };
  }

  if (legacyShareParam) {
    const payload = decodeLibrarySharePayloadFromQueryParam(legacyShareParam);
    return { payload, shortId: null, legacyShareParam };
  }

  return { payload: null, shortId: null, legacyShareParam: null };
}
