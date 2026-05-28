/**
 * Общие хелперы для `pages/api/google-*` (query, lookup в metadata).
 */
import type { NextApiRequest } from 'next';
import { resolveGoogleMetadataItalicMode, slimGoogleMetadataAxes } from './googleFontMetadataAxes';
import { getGoogleFontsMetadataFamilyList } from './googleFontsMetadataServer';
import {
  buildGoogleFontsCss2Url,
  fetchGoogleCssFaces,
  type GoogleCssAxis,
  type FetchGoogleCssFacesResult,
} from './googleFontsCssShared';

export type GoogleMetadataFamilyRow = {
  family?: string;
  axes?: unknown;
  fonts?: Record<string, unknown>;
};

export function apiQueryString(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

export function parseGoogleFontStyleQuery(query: NextApiRequest['query']) {
  const variable = query.variable !== 'false' && query.variable !== '0';
  const weight = apiQueryString(query.weight);
  const italic = query.italic === '1' || query.italic === 'true';
  const wghtMin = apiQueryString(query.wghtMin);
  const wghtMax = apiQueryString(query.wghtMax);
  const subset = typeof query.subset === 'string' ? query.subset.trim() : '';
  return { variable, weight, italic, wghtMin, wghtMax, subset };
}

export function findGoogleMetadataFamily<T extends GoogleMetadataFamilyRow>(
  list: unknown[],
  family: string,
): T | undefined {
  return list.find(
    (x): x is T => Boolean(x && typeof x === 'object' && (x as T).family === family),
  );
}

export async function getGoogleMetadataFamilyEntry<T extends GoogleMetadataFamilyRow>(
  family: string,
): Promise<T | undefined> {
  const list = await getGoogleFontsMetadataFamilyList();
  return findGoogleMetadataFamily<T>(list, family);
}

export type GoogleVariableCssContext = {
  axes: GoogleCssAxis[];
  italicMode: ReturnType<typeof resolveGoogleMetadataItalicMode>;
};

/** Оси и italicMode из metadata — для variable CSS2 URL. */
export async function resolveGoogleVariableCssContext(family: string): Promise<GoogleVariableCssContext> {
  const entry = await getGoogleMetadataFamilyEntry(family);
  if (!entry) {
    return { axes: [], italicMode: 'none' };
  }
  return {
    axes: slimGoogleMetadataAxes(entry.axes),
    italicMode: resolveGoogleMetadataItalicMode(entry.axes, entry.fonts),
  };
}

export async function resolveGoogleFontCssContext(
  family: string,
  variable: boolean,
): Promise<GoogleVariableCssContext> {
  if (!variable) {
    return { axes: [], italicMode: 'none' };
  }
  return resolveGoogleVariableCssContext(family);
}

export type GoogleFontStyleQuery = ReturnType<typeof parseGoogleFontStyleQuery>;

/** URL для `/api/google-font-faces` (VF без weight/italic в query string). */
export function buildGoogleFontsCss2UrlForFaces(
  family: string,
  style: GoogleFontStyleQuery,
  ctx: GoogleVariableCssContext,
): string {
  const { variable, weight, italic, wghtMin, wghtMax, subset } = style;
  if (variable) {
    return buildGoogleFontsCss2Url(family, {
      variable: true,
      wghtMin,
      wghtMax,
      subset: subset || undefined,
      axes: ctx.axes,
      italicMode: ctx.italicMode,
    });
  }
  return buildGoogleFontsCss2Url(family, {
    variable: false,
    weight,
    italic,
    subset: subset || undefined,
  });
}

/** URL для `/api/google-font` (primary, с fallback на static). */
export function buildGoogleFontsCss2UrlForWoff2Download(
  family: string,
  style: GoogleFontStyleQuery,
  ctx: GoogleVariableCssContext,
): string {
  const { variable, weight, italic, wghtMin, wghtMax } = style;
  return buildGoogleFontsCss2Url(family, {
    variable,
    weight,
    italic,
    wghtMin,
    wghtMax,
    axes: ctx.axes,
    italicMode: ctx.italicMode,
  });
}

export function buildGoogleStaticFallbackCssUrl(
  family: string,
  style: Pick<GoogleFontStyleQuery, 'weight' | 'italic'>,
): string {
  return buildGoogleFontsCss2Url(family, {
    variable: false,
    weight: style.weight || '400',
    italic: style.italic || false,
  });
}

export async function fetchGoogleFontCssFacesForFamily(
  family: string,
  style: GoogleFontStyleQuery,
): Promise<FetchGoogleCssFacesResult> {
  const ctx = await resolveGoogleFontCssContext(family, style.variable);
  const cssUrl = buildGoogleFontsCss2UrlForFaces(family, style, ctx);
  return fetchGoogleCssFaces(cssUrl);
}
