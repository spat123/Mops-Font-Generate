import type { LibrarySharePayload } from '../../utils/libraryShareLink';
import { decodeLibrarySharePayloadFromQueryParam } from '../../utils/libraryShareLinkServer';

/**
 * Разрешение payload для /api/og/share (edge).
 * Без импорта shareLinkStore/postgres — короткий id через внутренний GET /api/share/:id.
 */
export async function resolveSharePayloadForOg(
  origin: string,
  query: { id?: string | null; share?: string | null },
): Promise<LibrarySharePayload | null> {
  const legacyShareParam = String(query?.share || '').trim();
  const shortId = String(query?.id || '').trim();

  if (legacyShareParam) {
    return decodeLibrarySharePayloadFromQueryParam(legacyShareParam);
  }

  if (!shortId) {
    return null;
  }

  const base = String(origin).replace(/\/$/, '');
  const res = await fetch(`${base}/api/share/${encodeURIComponent(shortId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error('[og] share payload fetch failed', shortId, res.status);
    return null;
  }

  const body = (await res.json()) as { payload?: LibrarySharePayload | null };
  return body?.payload ?? null;
}
