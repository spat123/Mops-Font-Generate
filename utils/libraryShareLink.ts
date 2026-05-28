import type { ShareCatalogItem, ShareCloudItem } from './libraryShareImport';

export type FontFingerprint = {
  sha256: string;
  size: number;
  family: string;
  sourceHint: string;
  key: string;
};

export type SharePayloadCatalogItem = ShareCatalogItem & {
  confidence?: string;
  needsFingerprintVerification?: boolean;
  fingerprint?: FontFingerprint | null;
  actions?: string[];
};

export type SharePayloadCloudItem = ShareCloudItem & {
  fingerprint?: FontFingerprint | null;
  fileMeta?: { originalName: string; mimeType: string; size: number } | null;
  actions?: string[];
};

export type LibrarySharePayload = {
  version: 1;
  library: { id: string; name: string };
  items: Array<SharePayloadCatalogItem | SharePayloadCloudItem>;
};

function parseSharePayloadJson(json: string): LibrarySharePayload | null {
  const data = JSON.parse(json) as LibrarySharePayload;
  if (!data || typeof data !== 'object') return null;
  if (Number(data.version) !== 1) return null;
  if (!Array.isArray(data.items)) return null;
  return data;
}

/** Декодирует параметр `share` (base64url) в объект пейлоада. */
export function decodeLibrarySharePayloadFromQueryParam(
  param: string | null | undefined,
): LibrarySharePayload | null {
  if (param == null) return null;
  const raw = String(param).trim();
  if (!raw) return null;
  if (typeof atob !== 'function') return null;
  try {
    let base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return parseSharePayloadJson(json);
  } catch {
    return null;
  }
}

/** Кодирует JSON-пейлоад шаринга библиотеки в параметр URL (base64url). */
export function encodeLibrarySharePayloadToQueryParam(payload: LibrarySharePayload): string {
  if (typeof btoa !== 'function') return '';
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Короткая ссылка `/share?id=…` (Postgres) или длинная `/share?share=…` (fallback). */
export async function buildAbsoluteLibraryShareUrl(payload: LibrarySharePayload): Promise<string> {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;

  try {
    const res = await fetch('/api/share/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    if (res.ok && typeof data?.url === 'string' && data.url) {
      return data.url;
    }
  } catch {
    /* fallback */
  }

  const param = encodeLibrarySharePayloadToQueryParam(payload);
  const url = new URL(`${origin}/share`);
  url.searchParams.set('share', param);
  return url.toString();
}
