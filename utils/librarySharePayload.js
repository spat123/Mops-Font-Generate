import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import { readFontsourceCatalogCache } from './fontsourceCatalogCache';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function buildFontFingerprint({ file, sourceHint, family }) {
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

function resolveCatalogRefForEntry(fontEntry) {
  const source = String(fontEntry?.source || '').trim().toLowerCase();
  const id = String(fontEntry?.id || '').trim();
  const label = String(fontEntry?.label || '').trim();
  if (source === 'google') {
    const family = id.startsWith('google:') ? id.slice('google:'.length) : label;
    if (!family) return null;
    return { source: 'google', key: family, family };
  }
  if (source === 'fontsource') {
    const slug = id.startsWith('fontsource:') ? id.slice('fontsource:'.length) : '';
    if (!slug) return null;
    return { source: 'fontsource', key: slug, family: label || slug };
  }
  return null;
}

function detectCatalogMatchForLocal(fontEntry) {
  const label = String(fontEntry?.label || '').trim();
  if (!label) return null;
  const normalizedLabel = normalizeText(label);

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

  return null;
}

export async function buildLibrarySharePayload(library, { resolveSessionFont } = {}) {
  const libraryId = String(library?.id || '').trim();
  const libraryName = String(library?.name || '').trim();
  const entries = Array.isArray(library?.fonts) ? library.fonts : [];

  const payloadItems = await Promise.all(
    entries.map(async (fontEntry) => {
      const catalogRef = resolveCatalogRefForEntry(fontEntry);
      if (catalogRef) {
        return {
          kind: 'catalog-ref',
          source: catalogRef.source,
          key: catalogRef.key,
          family: catalogRef.family,
          actions: ['download', 'add-to-library'],
        };
      }

      const sessionFont =
        typeof resolveSessionFont === 'function' ? resolveSessionFont(fontEntry) : null;
      const sourceHint = String(sessionFont?.source || fontEntry?.source || 'local');
      const family = String(fontEntry?.label || sessionFont?.name || '').trim();
      const fingerprint = await buildFontFingerprint({
        file: sessionFont?.file,
        sourceHint,
        family,
      });
      const catalogMatch = detectCatalogMatchForLocal(fontEntry);

      if (catalogMatch) {
        return {
          kind: 'catalog-ref',
          source: catalogMatch.source,
          key: catalogMatch.key,
          family: catalogMatch.family,
          confidence: catalogMatch.confidence,
          needsFingerprintVerification: catalogMatch.needsFingerprintVerification,
          fingerprint,
          actions: ['download', 'add-to-library'],
        };
      }

      return {
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
      };
    }),
  );

  return {
    version: 1,
    library: {
      id: libraryId,
      name: libraryName,
    },
    items: payloadItems.filter(Boolean),
  };
}
