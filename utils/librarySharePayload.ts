import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import { resolveCatalogIsVariable } from './libraryShareImport';
import {
  parseFontfabricTrialEntrySlug,
  parseFontshareEntrySlug,
  parseFontsourceEntrySlug,
  parseGoogleEntryFamily,
} from './catalogCacheLookup';
import { resolvePreferredLibraryPickerEntry } from './libraryPickerCatalogSearch';
import type { SavedLibraryRecord } from '../types/editorFonts';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';
import type { SessionFontRecord } from '../types/editorFonts';
import type {
  FontFingerprint,
  LibrarySharePayload,
  SharePayloadCatalogItem,
  SharePayloadCloudItem,
} from './libraryShareLink';

function normalizeText(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildFontFingerprint({
  file,
  sourceHint,
  family,
}: {
  file?: Blob | null;
  sourceHint?: string;
  family?: string;
}): Promise<FontFingerprint | null> {
  if (!(file instanceof Blob) || file.size <= 0) return null;
  if (!globalThis?.crypto?.subtle) return null;
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', arrayBuffer);
  const sha256 = toHex(hashBuffer);
  const normalizedFamily = String(family || '').trim();
  const normalizedSourceHint = String(sourceHint || 'local').trim().toLowerCase();
  return {
    sha256,
    size: file.size,
    family: normalizedFamily,
    sourceHint: normalizedSourceHint,
    key: `${sha256}:${normalizedSourceHint}:${normalizeText(normalizedFamily)}`,
  };
}

type CatalogRef = { source: string; key: string; family: string };

function resolveCatalogRefForEntry(fontEntry: SavedLibraryFontEntry): CatalogRef | null {
  const preferredEntry = resolvePreferredLibraryPickerEntry(fontEntry) || fontEntry;
  const source = String(preferredEntry?.source || '').trim().toLowerCase();
  const id = String(preferredEntry?.id || '').trim();
  const label = String(preferredEntry?.label || '').trim();
  if (source === 'google') {
    const family = parseGoogleEntryFamily(id) || label.replace(/\s+\d+$/i, '').trim();
    if (!family) return null;
    return { source: 'google', key: family, family };
  }
  if (source === 'fontsource') {
    const slug = parseFontsourceEntrySlug(id);
    if (!slug) return null;
    return { source: 'fontsource', key: slug, family: label || slug };
  }
  if (source === 'fontshare') {
    const slug = parseFontshareEntrySlug(id);
    if (!slug) return null;
    return { source: 'fontshare', key: slug, family: label || slug };
  }
  if (source === 'fontfabric-trial') {
    const slug = parseFontfabricTrialEntrySlug(id);
    if (!slug) return null;
    return { source: 'fontfabric-trial', key: slug, family: label || slug };
  }
  return null;
}

function resolveIsVariableForLibraryEntry(
  fontEntry: SavedLibraryFontEntry,
  sessionFont: SessionFontRecord | null = null,
): boolean {
  if (fontEntry?.isVariable === true) return true;
  if (sessionFont?.isVariableFont === true) return true;
  const catalogRef = resolveCatalogRefForEntry(fontEntry);
  if (catalogRef) {
    return resolveCatalogIsVariable(catalogRef.source, catalogRef.key);
  }
  return false;
}

type FontEntryWithCascade = SavedLibraryFontEntry & {
  cascadeSizes?: number[];
  cascadePx?: number[];
};

function withOptionalCascadeSizes<T extends SharePayloadCatalogItem | SharePayloadCloudItem>(
  base: T,
  fontEntry: FontEntryWithCascade,
): T {
  const raw = fontEntry?.cascadeSizes ?? fontEntry?.cascadePx;
  if (!Array.isArray(raw) || raw.length === 0) return base;
  const cascadeSizes = raw.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
  if (cascadeSizes.length === 0) return base;
  return { ...base, cascadeSizes };
}

function detectCatalogMatchForLocal(fontEntry: SavedLibraryFontEntry): {
  source: string;
  key: string;
  family: string;
  confidence: string;
  needsFingerprintVerification: boolean;
} | null {
  const label = String(fontEntry?.label || '').trim();
  if (!label) return null;
  const normalizedLabel = normalizeText(label);

  const fontsource = readFontsourceCatalogCache();
  const fontsourceHit = (Array.isArray(fontsource) ? fontsource : []).find(
    (entry) =>
      normalizeText(entry?.family) === normalizedLabel ||
      normalizeText(entry?.id || entry?.slug) === normalizedLabel,
  );
  if (fontsourceHit?.id || fontsourceHit?.slug) {
    const slug = String(fontsourceHit.id || fontsourceHit.slug);
    return {
      source: 'fontsource',
      key: slug,
      family: String(fontsourceHit.family || label),
      confidence: 'name-exact',
      needsFingerprintVerification: true,
    };
  }

  const google = readGoogleFontCatalogCache();
  const googleHit = (Array.isArray(google) ? google : []).find(
    (entry) => normalizeText(entry?.family) === normalizedLabel,
  );
  if (googleHit?.family) {
    return {
      source: 'google',
      key: String(googleHit.family),
      family: String(googleHit.family),
      confidence: 'name-exact',
      needsFingerprintVerification: true,
    };
  }

  return null;
}

export async function buildLibrarySharePayload(
  library: SavedLibraryRecord | null | undefined,
  {
    resolveSessionFont,
  }: {
    resolveSessionFont?: (fontEntry: SavedLibraryFontEntry) => SessionFontRecord | null | undefined;
  } = {},
): Promise<LibrarySharePayload> {
  const libraryId = String(library?.id || '').trim();
  const libraryName = String(library?.name || '').trim();
  const entries = Array.isArray(library?.fonts) ? library.fonts : [];

  const payloadItems = await Promise.all(
    entries.map(async (fontEntry): Promise<SharePayloadCatalogItem | SharePayloadCloudItem | null> => {
      const sessionFont =
        typeof resolveSessionFont === 'function' ? resolveSessionFont(fontEntry) ?? null : null;
      const catalogRef = resolveCatalogRefForEntry(fontEntry);
      if (catalogRef) {
        const isVariable = resolveIsVariableForLibraryEntry(fontEntry, sessionFont);
        return withOptionalCascadeSizes(
          {
            kind: 'catalog-ref',
            source: catalogRef.source,
            key: catalogRef.key,
            family: catalogRef.family,
            ...(isVariable ? { isVariable: true } : {}),
            actions: ['download', 'add-to-library'],
          },
          fontEntry,
        );
      }
      const sourceHint = String(sessionFont?.source || fontEntry?.source || 'local');
      const family = String(fontEntry?.label || sessionFont?.name || '').trim();
      const fingerprint = await buildFontFingerprint({
        file: sessionFont?.file,
        sourceHint,
        family,
      });
      const catalogMatch = detectCatalogMatchForLocal(fontEntry);

      if (catalogMatch) {
        const isVariable = resolveIsVariableForLibraryEntry(fontEntry, sessionFont);
        return withOptionalCascadeSizes(
          {
            kind: 'catalog-ref',
            source: catalogMatch.source,
            key: catalogMatch.key,
            family: catalogMatch.family,
            ...(isVariable ? { isVariable: true } : {}),
            confidence: catalogMatch.confidence,
            needsFingerprintVerification: catalogMatch.needsFingerprintVerification,
            fingerprint,
            actions: ['download', 'add-to-library'],
          },
          fontEntry,
        );
      }

      return withOptionalCascadeSizes(
        {
          kind: 'cloud-upload-ref',
          key: String(fontEntry?.id || family || `local-${Math.random().toString(36).slice(2)}`),
          family,
          fingerprint,
          fileMeta: sessionFont?.file
            ? {
                originalName: String(sessionFont?.originalName || ''),
                mimeType: String(sessionFont?.file?.type || 'application/octet-stream'),
                size: Number(sessionFont?.file?.size || 0),
              }
            : null,
          actions: ['download', 'add-to-library'],
        },
        fontEntry,
      );
    }),
  );

  return {
    version: 1,
    library: {
      id: libraryId,
      name: libraryName,
    },
    items: payloadItems.filter((item): item is SharePayloadCatalogItem | SharePayloadCloudItem => item != null),
  };
}
