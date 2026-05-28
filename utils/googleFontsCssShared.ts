/**
 * Общая логика URL CSS Google Fonts и разбор @font-face (сервер + при необходимости клиент).
 */

export const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type GoogleCssAxis = {
  tag: string;
  min?: number;
  max?: number;
  defaultValue?: number;
};

export type BuildGoogleFontsCss2UrlOpts = {
  variable?: boolean;
  weight?: string | number;
  italic?: boolean;
  wghtMin?: number | string;
  wghtMax?: number | string;
  subset?: string;
  axes?: GoogleCssAxis[];
  italicMode?: 'none' | 'axis-ital' | 'axis-slnt' | 'separate-style' | string;
};

export type ParsedGoogleFontFace = {
  url: string;
  unicodeRange: string | null;
  weight: string;
  style: string;
};

export function buildGoogleFontsCss2Url(family: string, opts: BuildGoogleFontsCss2UrlOpts = {}): string {
  const { variable, weight, italic, wghtMin, wghtMax, subset, axes, italicMode } = opts;
  const name = String(family).trim().replace(/\s+/g, '+');
  const subsetQs =
    typeof subset === 'string' && subset.trim()
      ? `&subset=${subset
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(',')}`
      : '';
  const axisList = Array.isArray(axes) ? axes.filter((axis) => axis && typeof axis.tag === 'string') : [];
  const axisMap = axisList.reduce<Record<string, GoogleCssAxis>>((acc, axis) => {
    acc[axis.tag] = axis;
    return acc;
  }, {});

  const clampAxisRange = (
    tag: string,
    rawMin: number | string | undefined,
    rawMax: number | string | undefined,
    fallbackMin: number,
    fallbackMax: number,
  ): [number | undefined, number | undefined] => {
    const axis = axisMap[tag];
    let min = Number.isFinite(Number(rawMin)) ? Number(rawMin) : Number(fallbackMin);
    let max = Number.isFinite(Number(rawMax)) ? Number(rawMax) : Number(fallbackMax);
    if (!Number.isFinite(min) && Number.isFinite(max)) min = max;
    if (!Number.isFinite(max) && Number.isFinite(min)) max = min;
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [undefined, undefined];
    if (axis && Number.isFinite(Number(axis.min)) && Number.isFinite(Number(axis.max))) {
      const axisMin = Math.min(Number(axis.min), Number(axis.max));
      const axisMax = Math.max(Number(axis.min), Number(axis.max));
      min = Math.min(axisMax, Math.max(axisMin, min));
      max = Math.min(axisMax, Math.max(axisMin, max));
    }
    if (max < min) max = min;
    return [min, max];
  };

  if (variable) {
    const variableAxes = axisList.filter((axis) => {
      const min = Number(axis?.min);
      const max = Number(axis?.max);
      return Number.isFinite(min) && Number.isFinite(max) && max > min;
    });

    if (!variableAxes.length) {
      const w = String(weight || '400');
      if (italic) {
        return `https://fonts.googleapis.com/css2?family=${name}:ital,wght@1,${w}&display=swap${subsetQs}`;
      }
      return `https://fonts.googleapis.com/css2?family=${name}:wght@${w}&display=swap${subsetQs}`;
    }

    const axisTags = variableAxes.map((axis) => axis.tag);
    const includeItalAxis = italicMode === 'axis-ital' && axisTags.includes('ital');
    const rangeTags = variableAxes
      .map((axis) => axis.tag)
      .filter((tag) => tag !== 'ital')
      .sort((a, b) => a.localeCompare(b));
    const orderedTags = includeItalAxis ? ['ital', ...rangeTags] : rangeTags;

    const buildRangeToken = (tag: string): string | null => {
      if (tag === 'wght') {
        const [min, max] = clampAxisRange(
          tag,
          wghtMin,
          wghtMax,
          axisMap.wght?.min ?? 100,
          axisMap.wght?.max ?? 900,
        );
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
        return `${Math.round(min as number)}..${Math.round(max as number)}`;
      }
      const axis = axisMap[tag];
      const [min, max] = clampAxisRange(tag, axis?.min, axis?.max, axis?.min, axis?.max);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
      if (Math.round(min as number) === Math.round(max as number)) return `${Math.round(min as number)}`;
      return `${Math.round(min as number)}..${Math.round(max as number)}`;
    };

    const rangeValues = orderedTags.map((tag) => buildRangeToken(tag));
    if (rangeValues.some((value) => !value)) {
      return `https://fonts.googleapis.com/css2?family=${name}&display=swap${subsetQs}`;
    }

    if (includeItalAxis) {
      const romanTuple = ['0', ...rangeValues];
      const italicTuple = ['1', ...rangeValues];
      return `https://fonts.googleapis.com/css2?family=${name}:${orderedTags.join(',')}@${romanTuple.join(',')};${italicTuple.join(',')}&display=swap${subsetQs}`;
    }

    return `https://fonts.googleapis.com/css2?family=${name}:${orderedTags.join(',')}@${rangeValues.join(',')}&display=swap${subsetQs}`;
  }
  const w = String(weight || '400');
  if (italic) {
    return `https://fonts.googleapis.com/css2?family=${name}:ital,wght@1,${w}&display=swap${subsetQs}`;
  }
  return `https://fonts.googleapis.com/css2?family=${name}:wght@${w}&display=swap${subsetQs}`;
}

/** Извлекает из ответа Google Fonts CSS все @font-face с woff2 на gstatic (порядок как в CSS). */
export function parseGoogleFontFacesFromCss(cssText: string): ParsedGoogleFontFace[] {
  if (!cssText || typeof cssText !== 'string') return [];
  const merged = new Map<string, ParsedGoogleFontFace>();
  const blockRe = /@font-face\s*\{([\s\S]*?)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(cssText)) !== null) {
    const block = m[1];
    const urlM = /url\s*\(\s*(['"]?)(https:\/\/fonts\.gstatic\.com\/[^'")\s]+\.woff2)\1\s*\)/i.exec(block);
    if (!urlM) continue;
    const url = urlM[2];

    let unicodeRange: string | null = null;
    const urM = /unicode-range:\s*([^;]+);/i.exec(block);
    if (urM) unicodeRange = urM[1].trim();

    let weight = '400';
    const wM = /font-weight:\s*([^;]+);/i.exec(block);
    if (wM) weight = wM[1].trim().split(/\s+/)[0];

    let style = 'normal';
    const sM = /font-style:\s*([^;]+);/i.exec(block);
    if (sM) {
      const raw = sM[1].trim().toLowerCase();
      style = raw.startsWith('italic') ? 'italic' : 'normal';
    }

    const key = `${url}|${weight}|${style}`;
    const prev = merged.get(key);
    if (prev) {
      if (unicodeRange && prev.unicodeRange) {
        prev.unicodeRange = `${prev.unicodeRange}, ${unicodeRange}`;
      } else if (unicodeRange && !prev.unicodeRange) {
        prev.unicodeRange = unicodeRange;
      }
      continue;
    }
    merged.set(key, { url, unicodeRange, weight, style });
  }
  return [...merged.values()];
}

export type FetchGoogleCssFacesResult =
  | { faces: ParsedGoogleFontFace[] }
  | { error: string; status?: number };

export type FetchGoogleWoff2Result = { buf: Buffer } | { error: string; status?: number };

/** Загружает CSS Google Fonts и разбирает все @font-face woff2. */
export async function fetchGoogleCssFaces(cssUrl: string): Promise<FetchGoogleCssFacesResult> {
  const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': CHROME_UA } });
  if (!cssRes.ok) {
    return { error: 'Failed to fetch Google Fonts CSS', status: cssRes.status };
  }
  const css = await cssRes.text();
  const faces = parseGoogleFontFacesFromCss(css);
  if (!faces.length) {
    return { error: 'No woff2 faces in CSS response' };
  }
  return { faces };
}

/** Скачивает первый woff2 из CSS Google Fonts (серверные API). */
export async function fetchWoff2BufferFromGoogleCss(cssUrl: string): Promise<FetchGoogleWoff2Result> {
  const parsed = await fetchGoogleCssFaces(cssUrl);
  if ('error' in parsed) {
    return {
      error:
        parsed.error === 'No woff2 faces in CSS response'
          ? 'No woff2 URL found in CSS response'
          : parsed.error,
      status: parsed.status,
    };
  }
  const fontUrl = parsed.faces[0].url;
  const fontRes = await fetch(fontUrl, { headers: { 'User-Agent': CHROME_UA } });
  if (!fontRes.ok) {
    return { error: 'Failed to fetch font file', status: fontRes.status };
  }
  const buf = Buffer.from(await fontRes.arrayBuffer());
  if (!buf.length) {
    return { error: 'Empty font response' };
  }
  return { buf };
}
