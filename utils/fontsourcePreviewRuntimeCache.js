import {
  FONTSOURCE_UNICODE_RANGE_CYRILLIC,
  FONTSOURCE_UNICODE_RANGE_LATIN,
} from './fontsourceSubsetUnicodeRange';

const loadedFamilyBySlug = new Map();
const loadingBySlug = new Map();
/** @type {Map<string, string[]>} */
const blobUrlsBySlug = new Map();

function base64ToUint8Array(base64) {
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export function getFontsourcePreviewFamily(slug) {
  if (!slug) return null;
  return loadedFamilyBySlug.get(slug) || null;
}

export function hasFontsourcePreviewFamily(slug) {
  if (!slug) return false;
  return loadedFamilyBySlug.has(slug);
}

function unicodeRangeForFontsourceSubset(subset) {
  const s = String(subset || '').toLowerCase();
  if (s === 'cyrillic' || s === 'cyrillic-ext') {
    return FONTSOURCE_UNICODE_RANGE_CYRILLIC;
  }
  if (s === 'latin' || s === 'latin-ext') {
    return FONTSOURCE_UNICODE_RANGE_LATIN;
  }
  return null;
}

async function fetchFontsourceSubsetBase64(slug, weight, style, subset) {
  const response = await fetch(
    `/api/fontsource/${encodeURIComponent(slug)}?weight=${encodeURIComponent(weight)}&style=${encodeURIComponent(style)}&subset=${encodeURIComponent(subset)}`,
  );
  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  const base64 = payload?.fontData ?? payload?.fontBufferBase64;
  const fileName = String(payload?.actualFileName ?? payload?.fileName ?? '');
  if (!base64) {
    return null;
  }
  return { base64, fileName };
}

export async function loadFontsourcePreviewFamily(slug, params = {}) {
  if (!slug) return null;
  if (loadedFamilyBySlug.has(slug)) return loadedFamilyBySlug.get(slug);
  if (loadingBySlug.has(slug)) return loadingBySlug.get(slug);

  const weight = String(params.weight || '400');
  const style = String(params.style || 'normal');
  const subsetParam = params.subset != null ? String(params.subset).trim() : '';
  const subsetsToLoad = subsetParam ? [subsetParam] : ['latin', 'cyrillic'];

  const promise = (async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof FontFace === 'undefined') {
      return null;
    }

    const familyName = `fontsource-preview-${slug}`;
    const newBlobUrls = [];

    const revokeOldBlobs = () => {
      const oldUrls = blobUrlsBySlug.get(slug);
      if (Array.isArray(oldUrls)) {
        for (const u of oldUrls) {
          try {
            URL.revokeObjectURL(u);
          } catch {
            // noop
          }
        }
      }
    };

    let latinOk = false;
    for (const subset of subsetsToLoad) {
      const row = await fetchFontsourceSubsetBase64(slug, weight, style, subset);
      if (!row) {
        if (subset === 'latin') {
          throw new Error(`HTTP или пустой ответ для latin`);
        }
        continue;
      }
      if (subset === 'latin') {
        latinOk = true;
      }

      const ext = (row.fileName.split('.').pop() || 'woff2').toLowerCase();
      const mimeType =
        ext === 'ttf' ? 'font/ttf' : ext === 'otf' ? 'font/otf' : ext === 'woff' ? 'font/woff' : 'font/woff2';
      const bytes = base64ToUint8Array(row.base64);
      const blob = new Blob([bytes], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      newBlobUrls.push(objectUrl);

      const unicodeRange = unicodeRangeForFontsourceSubset(subset);
      const faceOpts = { weight: '400', style: 'normal' };
      if (unicodeRange) {
        faceOpts.unicodeRange = unicodeRange;
      }

      const fontFace = new FontFace(familyName, `url(${objectUrl})`, faceOpts);
      await fontFace.load();
      document.fonts.add(fontFace);
    }

    if (newBlobUrls.length === 0) {
      throw new Error('Не удалось загрузить превью шрифта');
    }
    if (!subsetParam && !latinOk) {
      throw new Error('Не удалось загрузить латинский сабсет');
    }

    revokeOldBlobs();
    blobUrlsBySlug.set(slug, newBlobUrls);
    loadedFamilyBySlug.set(slug, `${familyName}, system-ui, sans-serif`);
    return loadedFamilyBySlug.get(slug);
  })();

  loadingBySlug.set(slug, promise);
  try {
    return await promise;
  } finally {
    loadingBySlug.delete(slug);
  }
}

export async function preloadFontsourcePreviewSlugs(slugs, params = {}) {
  const list = Array.isArray(slugs) ? slugs.filter(Boolean) : [];
  if (list.length === 0) return;

  const concurrency = Math.max(1, Number(params.concurrency || 2));
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      const slug = list[index];
      try {
        await loadFontsourcePreviewFamily(slug, params);
      } catch {
        // Превью необязательны — продолжаем.
      }
    }
  });

  await Promise.allSettled(workers);
}
