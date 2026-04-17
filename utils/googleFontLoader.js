/**
 * Загружает бинарник шрифта Google Fonts (woff2) через серверный API-прокси.
 * @param {string} family - Имя семейства, например "Roboto", "Open Sans"
 * @param {{ variable?: boolean, wghtMin?: number, wghtMax?: number, weight?: number, italic?: boolean }} [opts]
 *   variable=false — статический файл; для variable можно передать wghtMin/wghtMax из каталога (напр. Roboto Flex 100–1000).
 * @returns {Promise<Blob>}
 */
export async function fetchGoogleFontBlob(family, opts = {}) {
  const variable = opts.variable !== false;
  const q = new URLSearchParams();
  q.set('family', family);
  if (!variable) {
    q.set('variable', 'false');
    if (opts.weight != null) q.set('weight', String(opts.weight));
    if (opts.italic) q.set('italic', '1');
  } else {
    if (opts.wghtMin != null) q.set('wghtMin', String(opts.wghtMin));
    if (opts.wghtMax != null) q.set('wghtMax', String(opts.wghtMax));
  }

  const url = `/api/google-font?${q.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j.error || JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.blob();
}

function parseSliceWeight(w) {
  const s = String(w ?? '400').trim();
  const n = parseInt(s.split(/\s+/)[0], 10);
  return Number.isFinite(n) ? n : 400;
}

/**
 * Все статические woff2-сабсеты семейства (латиница, кириллица и т.д.), как в CSS Google.
 * @param {string} family
 * @param {{ weight?: number|string, italic?: boolean }} [opts]
 * @returns {Promise<{ blob: Blob, unicodeRange: string|null, weight: number, style: 'normal'|'italic' }[]>}
 */
async function loadWoff2FromGstatic(url) {
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

async function fetchGoogleFontFacesSlices(family, searchParams) {
  const manifestRes = await fetch(`/api/google-font-faces?${searchParams.toString()}`);
  if (!manifestRes.ok) {
    let detail = '';
    try {
      const j = await manifestRes.json();
      detail = j.error || JSON.stringify(j);
    } catch {
      detail = await manifestRes.text();
    }
    throw new Error(detail || `HTTP ${manifestRes.status}`);
  }
  const data = await manifestRes.json();
  const faces = data?.faces;
  if (!Array.isArray(faces) || !faces.length) {
    throw new Error('Пустой список начертаний в CSS Google');
  }

  return Promise.all(
    faces.map(async (face) => {
      const weight = parseSliceWeight(face.weight);
      const style = face.style === 'italic' ? 'italic' : 'normal';
      const blob = await loadWoff2FromGstatic(face.url);
      return {
        blob,
        unicodeRange: face.unicodeRange || null,
        weight,
        style,
      };
    }),
  );
}

function appendSubsetParam(params, subsets) {
  if (!Array.isArray(subsets) || !subsets.length) return;
  const s = subsets.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean);
  if (!s.length) return;
  params.set('subset', s.join(','));
}

export async function fetchGoogleStaticFontSlicesAll(family, opts = {}) {
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
export async function fetchGoogleVariableFontSlicesAll(family, opts = {}) {
  const params = new URLSearchParams();
  params.set('family', family);
  params.set('variable', 'true');
  if (opts.wghtMin != null) params.set('wghtMin', String(opts.wghtMin));
  if (opts.wghtMax != null) params.set('wghtMax', String(opts.wghtMax));
  appendSubsetParam(params, opts.subsets);
  return fetchGoogleFontFacesSlices(family, params);
}
