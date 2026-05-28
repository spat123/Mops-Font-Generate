import { base64ToUint8Array } from './base64Utils';
import { createPreviewFamilyLoader } from './createPreviewFamilyLoader';
import {
  FONTSOURCE_UNICODE_RANGE_CYRILLIC,
  FONTSOURCE_UNICODE_RANGE_LATIN,
} from './fontsourceSubsetUnicodeRange';

const previewLoader = createPreviewFamilyLoader();
const blobUrlsBySlug = new Map<string, string[]>();

export function getFontsourcePreviewFamily(slug: string): string | null {
  return previewLoader.getPreviewFamily(slug);
}

export function hasFontsourcePreviewFamily(slug: string): boolean {
  return previewLoader.hasPreviewFamily(slug);
}

function unicodeRangeForFontsourceSubset(subset: string): string | null {
  const s = String(subset || '').toLowerCase();
  if (s === 'cyrillic' || s === 'cyrillic-ext') {
    return FONTSOURCE_UNICODE_RANGE_CYRILLIC;
  }
  if (s === 'latin' || s === 'latin-ext') {
    return FONTSOURCE_UNICODE_RANGE_LATIN;
  }
  return null;
}

async function fetchFontsourceSubsetBase64(
  slug: string,
  weight: string,
  style: string,
  subset: string,
): Promise<{ base64: string; fileName: string } | null> {
  const response = await fetch(
    `/api/fontsource/${encodeURIComponent(slug)}?weight=${encodeURIComponent(weight)}&style=${encodeURIComponent(style)}&subset=${encodeURIComponent(subset)}`,
  );
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as {
    fontData?: string;
    fontBufferBase64?: string;
    actualFileName?: string;
    fileName?: string;
  };
  const base64 = payload?.fontData ?? payload?.fontBufferBase64;
  const fileName = String(payload?.actualFileName ?? payload?.fileName ?? '');
  if (!base64) {
    return null;
  }
  return { base64, fileName };
}

export type LoadFontsourcePreviewParams = {
  weight?: string | number;
  style?: string;
  /** Один сабсет (если `subsets` не задан). */
  subset?: string;
  /** Явный список сабсетов; по умолчанию `latin` + `cyrillic`. */
  subsets?: string[];
};

function resolveFontsourceSubsetsToLoad(params: LoadFontsourcePreviewParams): string[] {
  if (Array.isArray(params.subsets) && params.subsets.length > 0) {
    return params.subsets.map((s) => String(s || '').toLowerCase()).filter(Boolean);
  }
  const one = params.subset != null ? String(params.subset).trim().toLowerCase() : '';
  if (one) return [one];
  return ['latin', 'cyrillic'];
}

/** Сброс кэша превью (при смене пресета образца в каталоге). */
export function resetFontsourcePreviewCache(): void {
  previewLoader.reset();
  for (const urls of blobUrlsBySlug.values()) {
    if (!Array.isArray(urls)) continue;
    for (const u of urls) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        // noop
      }
    }
  }
  blobUrlsBySlug.clear();
}

export async function loadFontsourcePreviewFamily(
  slug: string,
  params: LoadFontsourcePreviewParams = {},
): Promise<string | null> {
  const weight = String(params.weight || '400');
  const style = String(params.style || 'normal');
  const subsetsToLoad = resolveFontsourceSubsetsToLoad(params);
  const needsLatin = subsetsToLoad.includes('latin');

  return previewLoader.loadPreviewFamily(slug, async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof FontFace === 'undefined') {
      return null;
    }

    const familyName = `fontsource-preview-${slug}`;
    const newBlobUrls: string[] = [];

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

    let latinOk = !needsLatin;
    for (const subset of subsetsToLoad) {
      const row = await fetchFontsourceSubsetBase64(slug, weight, style, subset);
      if (!row) {
        if (subset === 'latin') {
          throw new Error('HTTP или пустой ответ для latin');
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
      const blob = new Blob([bytes as BlobPart], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      newBlobUrls.push(objectUrl);

      const unicodeRange = unicodeRangeForFontsourceSubset(subset);
      const faceOpts: FontFaceDescriptors = { weight: '400', style: 'normal' };
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
    if (needsLatin && !latinOk) {
      throw new Error('Не удалось загрузить латинский сабсет');
    }

    revokeOldBlobs();
    blobUrlsBySlug.set(slug, newBlobUrls);
    return `${familyName}, system-ui, sans-serif`;
  });
}

export type PreloadFontsourcePreviewParams = LoadFontsourcePreviewParams & {
  concurrency?: number;
};

export async function preloadFontsourcePreviewSlugs(
  slugs: string[],
  params: PreloadFontsourcePreviewParams = {},
): Promise<void> {
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
