export type GoogleFontSlice = {
  blob: Blob;
  unicodeRange: string | null;
  weight: number;
  style: 'normal' | 'italic';
};

export type GoogleFontLoaderOpts = {
  weight?: number | string;
  italic?: boolean;
  subsets?: string[];
  wghtMin?: number;
  wghtMax?: number;
};

function parseSliceWeight(w: unknown): number {
  const s = String(w ?? '400').trim();
  const n = parseInt(s.split(/\s+/)[0], 10);
  return Number.isFinite(n) ? n : 400;
}

async function loadWoff2FromGstatic(url: string): Promise<Blob> {
  let res = await fetch(url, { mode: 'cors' });
  if (!res.ok) {
    const proxy = `/api/google-font-proxy?${new URLSearchParams({ url })}`;
    res = await fetch(proxy);
  }
  if (!res.ok) {
    throw new Error(`Не удалось загрузить woff2 (${res.status})`);
  }
  return res.blob();
}

type GoogleFaceManifestRow = {
  url?: string;
  weight?: unknown;
  style?: string;
  unicodeRange?: string | null;
};

async function fetchGoogleFontFacesSlices(
  _family: string,
  searchParams: URLSearchParams,
): Promise<GoogleFontSlice[]> {
  const manifestRes = await fetch(`/api/google-font-faces?${searchParams.toString()}`);
  if (!manifestRes.ok) {
    let detail = '';
    try {
      const j = (await manifestRes.json()) as { error?: string };
      detail = j.error || JSON.stringify(j);
    } catch {
      detail = await manifestRes.text();
    }
    throw new Error(detail || `HTTP ${manifestRes.status}`);
  }
  const data = (await manifestRes.json()) as { faces?: GoogleFaceManifestRow[] };
  const faces = data?.faces;
  if (!Array.isArray(faces) || !faces.length) {
    throw new Error('Пустой список начертаний в CSS Google');
  }

  return Promise.all(
    faces.map(async (face) => {
      const weight = parseSliceWeight(face.weight);
      const style = face.style === 'italic' ? 'italic' : 'normal';
      const blob = await loadWoff2FromGstatic(String(face.url || ''));
      return {
        blob,
        unicodeRange: face.unicodeRange || null,
        weight,
        style,
      };
    }),
  );
}

function appendSubsetParam(params: URLSearchParams, subsets: string[] | undefined): void {
  if (!Array.isArray(subsets) || !subsets.length) return;
  const s = subsets.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean);
  if (!s.length) return;
  params.set('subset', s.join(','));
}

/** Все статические woff2-сабсеты семейства (латиница, кириллица и т.д.), как в CSS Google. */
export async function fetchGoogleStaticFontSlicesAll(
  family: string,
  opts: GoogleFontLoaderOpts = {},
): Promise<GoogleFontSlice[]> {
  const params = new URLSearchParams();
  params.set('family', family);
  params.set('variable', 'false');
  if (opts.weight != null) params.set('weight', String(opts.weight));
  if (opts.italic) params.set('italic', '1');
  appendSubsetParam(params, opts.subsets);
  return fetchGoogleFontFacesSlices(family, params);
}

/**
 * Все woff2-сабсеты вариативного семейства Google (как в CSS: разные unicode-range и URL).
 * Одного «первого» файла недостаточно — латиница часто в отдельном слайсе от кириллицы.
 */
export async function fetchGoogleVariableFontSlicesAll(
  family: string,
  opts: GoogleFontLoaderOpts = {},
): Promise<GoogleFontSlice[]> {
  const params = new URLSearchParams();
  params.set('family', family);
  params.set('variable', 'true');
  if (opts.wghtMin != null) params.set('wghtMin', String(opts.wghtMin));
  if (opts.wghtMax != null) params.set('wghtMax', String(opts.wghtMax));
  appendSubsetParam(params, opts.subsets);
  return fetchGoogleFontFacesSlices(family, params);
}
