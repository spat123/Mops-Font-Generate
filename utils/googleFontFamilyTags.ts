import { resolveCatalogCategory } from './fontCategoryLabels';
import type { GoogleFontCatalogRow } from './googleFontCatalogCache';

/** В кэше есть поле calligraphy (массив), заполненное из Google tags CSV. */
export function googleCatalogHasCalligraphyMetadata(items: unknown): boolean {
  return (
    Array.isArray(items) &&
    items.some(
      (row) =>
        row &&
        typeof row === 'object' &&
        Array.isArray((row as { calligraphy?: unknown }).calligraphy),
    )
  );
}

export function googleCatalogHasTagMetadata(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  const hasShapes = items.some((row) => row && Array.isArray(row.shapes) && row.shapes.length > 0);
  return hasShapes && googleCatalogHasCalligraphyMetadata(items);
}

export type GoogleFamilyTagsMaps = {
  feelingsByFamily: Map<string, string[]>;
  shapesByFamily: Map<string, string[]>;
  calligraphyByFamily: Map<string, string[]>;
  hasSlabByFamily: Map<string, boolean>;
};

/** Дополняет строки Google-каталога тегами формы/настроения/slab из CSV. */
export function enrichGoogleCatalogRows(
  items: GoogleFontCatalogRow[] | null | undefined,
  tagsMaps: GoogleFamilyTagsMaps | null | undefined,
): GoogleFontCatalogRow[] {
  if (!Array.isArray(items) || items.length === 0 || !tagsMaps) return items || [];
  const { feelingsByFamily, shapesByFamily, calligraphyByFamily, hasSlabByFamily } = tagsMaps;

  return items.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const family = String(row.family || '').trim();
    if (!family) return row;

    const hasSlab = hasSlabByFamily instanceof Map ? hasSlabByFamily.has(family) : Boolean(row.hasSlab);
    const shapes =
      shapesByFamily instanceof Map ? shapesByFamily.get(family) || row.shapes || [] : row.shapes || [];
    const feelings =
      feelingsByFamily instanceof Map ? feelingsByFamily.get(family) || row.feelings || [] : row.feelings || [];
    const calligraphy =
      calligraphyByFamily instanceof Map
        ? calligraphyByFamily.get(family) || row.calligraphy || []
        : row.calligraphy || [];

    return {
      ...row,
      hasSlab,
      shapes: Array.isArray(shapes) ? shapes : [],
      feelings: Array.isArray(feelings) ? feelings : [],
      calligraphy: Array.isArray(calligraphy) ? calligraphy : [],
      category:
        resolveCatalogCategory({
          category: row.category as string | undefined,
          stroke: row.stroke as string | undefined,
          hasSlab,
          family,
          id: row.id as string | undefined,
          slug: row.slug as string | undefined,
        }) || row.category,
    };
  });
}

const TAGS_CSV_URL = 'https://raw.githubusercontent.com/google/fonts/main/tags/all/families.csv';

export const GOOGLE_TAG_SCORE_THRESHOLD = 50;

/** Порядок «Feeling» в UI Google Fonts. */
export const GOOGLE_FEELING_ORDER = [
  'Active',
  'Artistic',
  'Awkward',
  'Business',
  'Calm',
  'Childlike',
  'Competent',
  'Cute',
  'Excited',
  'Fancy',
  'Futuristic',
  'Happy',
  'Innovative',
  'Loud',
  'Playful',
  'Rugged',
  'Sincere',
  'Sophisticated',
  'Stiff',
  'Vintage',
];

/** Теги Google → ключи фильтра «Форма». */
export const GOOGLE_SHAPE_TAG_RULES: Record<string, string[]> = {
  rounded: ['/Sans/Rounded'],
  'soft-rounded': ['/Sans/Superellipse', '/Theme/Blobby'],
  rectangular: ['/Sans/Grotesque', '/Sans/Neo Grotesque'],
  sharp: ['/Sans/Geometric'],
  angular: ['/Slab/Geometric', '/Slab/Humanist', '/Slab/Clarendon'],
  'volumetric-3d': ['/Theme/Shaded', '/Theme/Inline'],
};

/** Теги Google → ключи фильтра «Каллиграфия». */
export const GOOGLE_CALLIGRAPHY_TAG_RULES: Record<string, string[]> = {
  handwritten: ['/Script/Handwritten'],
  formal: ['/Script/Formal'],
  informal: ['/Script/Informal'],
  upright: ['/Script/Upright'],
};

const CALLIGRAPHY_TAG_SEGMENT_TO_KEY: Record<string, string> = {
  handwritten: 'handwritten',
  formal: 'formal',
  informal: 'informal',
  upright: 'upright',
};

function parseCsvLine(line: string): { family: string; tag: string; score: number } | null {
  const comma = line.indexOf(',');
  if (comma < 0) return null;
  const family = line.slice(0, comma).trim();
  if (!family) return null;

  const tagStart = line.indexOf('/', comma);
  if (tagStart < 0) return null;
  const tagEnd = line.indexOf(',', tagStart);
  const tag = tagEnd >= 0 ? line.slice(tagStart, tagEnd) : line.slice(tagStart);
  const scoreStr = tagEnd >= 0 ? line.slice(tagEnd + 1).trim() : '';
  const score = Number(scoreStr);
  if (!Number.isFinite(score)) return null;

  return { family, tag, score };
}

function familyNameSuggestsVolumetric3d(family: unknown): boolean {
  return /\b3d\b|3-d|extrude|volumetric|объем|объём/i.test(String(family || ''));
}

function deriveCalligraphyFromTagScores(tagScores: Map<string, number>): string[] {
  const calligraphy: string[] = [];
  for (const [key, tagPaths] of Object.entries(GOOGLE_CALLIGRAPHY_TAG_RULES)) {
    const hit = tagPaths.some((path) => (tagScores.get(path) || 0) >= GOOGLE_TAG_SCORE_THRESHOLD);
    if (hit) calligraphy.push(key);
  }
  if (calligraphy.length === 0) {
    for (const [tagPath, tagScore] of tagScores.entries()) {
      if (tagScore < GOOGLE_TAG_SCORE_THRESHOLD || !tagPath.startsWith('/Script/')) continue;
      const segment = tagPath.split('/')[2];
      const key = segment ? CALLIGRAPHY_TAG_SEGMENT_TO_KEY[String(segment).toLowerCase()] : null;
      if (key) calligraphy.push(key);
    }
  }
  return [...new Set(calligraphy)];
}

function deriveShapesFromTagScores(tagScores: Map<string, number>, family: string): string[] {
  const shapes: string[] = [];
  for (const [shapeKey, tagPaths] of Object.entries(GOOGLE_SHAPE_TAG_RULES)) {
    const hit = tagPaths.some((path) => (tagScores.get(path) || 0) >= GOOGLE_TAG_SCORE_THRESHOLD);
    if (hit) shapes.push(shapeKey);
  }
  if (familyNameSuggestsVolumetric3d(family)) {
    shapes.push('volumetric-3d');
  }
  return [...new Set(shapes)];
}

export function parseGoogleFamilyTagsCsv(
  text: unknown,
  { scoreThreshold = GOOGLE_TAG_SCORE_THRESHOLD }: { scoreThreshold?: number } = {},
): GoogleFamilyTagsMaps {
  const feelingsByFamily = new Map<string, Set<string>>();
  const shapesByFamily = new Map<string, string[]>();
  const calligraphyByFamily = new Map<string, string[]>();
  const hasSlabByFamily = new Map<string, boolean>();
  const tagsByFamily = new Map<string, Map<string, number>>();

  const lines = String(text || '')
    .trim()
    .split('\n');
  for (const line of lines) {
    const row = parseCsvLine(line);
    if (!row) continue;
    const { family, tag, score } = row;
    if (score < scoreThreshold) continue;

    if (!tagsByFamily.has(family)) tagsByFamily.set(family, new Map());
    const tagScores = tagsByFamily.get(family)!;
    const prev = tagScores.get(tag) || 0;
    if (score > prev) tagScores.set(tag, score);

    if (tag.startsWith('/Expressive/')) {
      const feel = tag.split('/')[2];
      if (!feel) continue;
      if (!feelingsByFamily.has(family)) feelingsByFamily.set(family, new Set());
      feelingsByFamily.get(family)!.add(feel);
    }
  }

  for (const [family, tagScores] of tagsByFamily.entries()) {
    shapesByFamily.set(family, deriveShapesFromTagScores(tagScores, family));
    calligraphyByFamily.set(family, deriveCalligraphyFromTagScores(tagScores));

    const hasSlab = [...tagScores.entries()].some(
      ([tagPath, tagScore]) => tagPath.startsWith('/Slab/') && tagScore >= scoreThreshold,
    );
    if (hasSlab) hasSlabByFamily.set(family, true);
  }

  const feelingsOut = new Map<string, string[]>();
  for (const [family, set] of feelingsByFamily.entries()) {
    feelingsOut.set(family, [...set]);
  }

  return { feelingsByFamily: feelingsOut, shapesByFamily, calligraphyByFamily, hasSlabByFamily };
}

export async function fetchGoogleFamilyTagsMaps({
  fetchImpl = fetch,
}: { fetchImpl?: typeof fetch } = {}): Promise<GoogleFamilyTagsMaps> {
  const r = await fetchImpl(TAGS_CSV_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinamicFont/1.0)' },
  });
  if (!r.ok) {
    throw new Error(`Google family tags CSV: HTTP ${r.status}`);
  }
  return parseGoogleFamilyTagsCsv(await r.text());
}

export const GOOGLE_FEELING_SCORE_THRESHOLD = GOOGLE_TAG_SCORE_THRESHOLD;
