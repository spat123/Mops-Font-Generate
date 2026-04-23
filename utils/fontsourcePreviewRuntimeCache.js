const loadedFamilyBySlug = new Map();
const loadingBySlug = new Map();
const blobUrlBySlug = new Map();

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

export async function loadFontsourcePreviewFamily(slug, params = {}) {
  if (!slug) return null;
  if (loadedFamilyBySlug.has(slug)) return loadedFamilyBySlug.get(slug);
  if (loadingBySlug.has(slug)) return loadingBySlug.get(slug);

  const weight = String(params.weight || '400');
  const style = String(params.style || 'normal');
  const subset = String(params.subset || 'latin');

  const promise = (async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof FontFace === 'undefined') {
      return null;
    }

    const response = await fetch(
      `/api/fontsource/${encodeURIComponent(slug)}?weight=${encodeURIComponent(weight)}&style=${encodeURIComponent(style)}&subset=${encodeURIComponent(subset)}`,
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const base64 = payload?.fontData ?? payload?.fontBufferBase64;
    const fileName = String(payload?.actualFileName ?? payload?.fileName ?? '');
    if (!base64) {
      throw new Error('Пустые данные шрифта');
    }

    const ext = (fileName.split('.').pop() || 'woff2').toLowerCase();
    const mimeType = ext === 'ttf' ? 'font/ttf' : ext === 'otf' ? 'font/otf' : ext === 'woff' ? 'font/woff' : 'font/woff2';
    const bytes = base64ToUint8Array(base64);
    const blob = new Blob([bytes], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const familyName = `fontsource-preview-${slug}`;

    const fontFace = new FontFace(familyName, `url(${objectUrl})`, {
      weight: '400',
      style: 'normal',
    });
    await fontFace.load();
    document.fonts.add(fontFace);

    const oldUrl = blobUrlBySlug.get(slug);
    if (oldUrl && oldUrl !== objectUrl) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {
        // noop
      }
    }
    blobUrlBySlug.set(slug, objectUrl);
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
