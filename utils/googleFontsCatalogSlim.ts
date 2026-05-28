/**
 * Сжатие строк metadata Google → элемент каталога (серверный `/api/google-fonts-catalog`).
 */
import { resolveGoogleMetadataItalicMode, slimGoogleMetadataAxes } from './googleFontMetadataAxes';
import { listGoogleDownloadStylesFromFontsObj } from './googleFontDownloadStyles';
import { resolveCatalogCategory } from './fontCategoryLabels';

type GoogleMetadataAxis = {
  tag?: string;
  min?: number;
  max?: number;
};

export type GoogleMetadataCatalogRow = {
  family?: string;
  category?: string;
  stroke?: string;
  axes?: GoogleMetadataAxis[];
  fonts?: Record<string, unknown>;
  subsets?: string[];
  classifications?: unknown[];
  defaultSort?: number;
  popularity?: number;
  primaryScript?: string;
};

export type GoogleCatalogTagsMaps = {
  feelingsByFamily?: Map<string, string[]>;
  shapesByFamily?: Map<string, string[]>;
  calligraphyByFamily?: Map<string, string[]>;
  hasSlabByFamily?: Map<string, boolean>;
};

function slimCatalogEntry(x: GoogleMetadataCatalogRow, tagsMaps: GoogleCatalogTagsMaps | null) {
  const axes = Array.isArray(x.axes) ? x.axes : [];
  const wght = axes.find((a) => a.tag === 'wght');
  const variableWght =
    wght && typeof wght.min === 'number' && typeof wght.max === 'number' && wght.max > wght.min;
  const hasVariableAxis = axes.some(
    (a) => a && typeof a.min === 'number' && typeof a.max === 'number' && a.max > a.min,
  );
  const fontsObj = x.fonts && typeof x.fonts === 'object' && !Array.isArray(x.fonts) ? x.fonts : {};
  const styleKeys = Object.keys(fontsObj);
  const hasItalicStyles = styleKeys.some((k) => /^\d+i$/.test(k));
  const subsets = Array.isArray(x.subsets) ? x.subsets.filter((s) => s && s !== 'menu') : [];
  const axesFull = slimGoogleMetadataAxes(axes);
  const italicMode = resolveGoogleMetadataItalicMode(axes, fontsObj);
  const classifications = Array.isArray(x.classifications)
    ? x.classifications.map((c) => String(c || '').trim()).filter(Boolean)
    : [];
  const feelings =
    tagsMaps?.feelingsByFamily instanceof Map ? tagsMaps.feelingsByFamily.get(x.family || '') || [] : [];
  const shapes =
    tagsMaps?.shapesByFamily instanceof Map ? tagsMaps.shapesByFamily.get(x.family || '') || [] : [];
  const calligraphy =
    tagsMaps?.calligraphyByFamily instanceof Map
      ? tagsMaps.calligraphyByFamily.get(x.family || '') || []
      : [];
  const hasSlab =
    tagsMaps?.hasSlabByFamily instanceof Map ? tagsMaps.hasSlabByFamily.has(x.family || '') : false;
  const stroke = typeof x.stroke === 'string' ? x.stroke : '';
  return {
    family: x.family,
    category: resolveCatalogCategory({ category: x.category, stroke, hasSlab }),
    stroke,
    classifications,
    feelings,
    shapes,
    calligraphy: Array.isArray(calligraphy) ? calligraphy : [],
    hasSlab,
    defaultSort:
      typeof x.defaultSort === 'number'
        ? x.defaultSort
        : typeof x.popularity === 'number'
          ? x.popularity
          : 999999,
    wghtMin: variableWght ? Math.round(wght.min!) : null,
    wghtMax: variableWght ? Math.round(wght.max!) : null,
    isVariable: hasVariableAxis,
    axes: axesFull,
    subsets,
    styleCount: styleKeys.length,
    hasItalic: hasItalicStyles,
    hasItalicStyles,
    italicMode,
    primaryScript: typeof x.primaryScript === 'string' ? x.primaryScript : '',
    downloadStyles: listGoogleDownloadStylesFromFontsObj(fontsObj),
  };
}

export function buildGoogleCatalogItems(
  list: unknown[],
  tagsMaps: GoogleCatalogTagsMaps | null,
) {
  const rows = list.filter(
    (x): x is GoogleMetadataCatalogRow => Boolean(x && typeof x === 'object'),
  );
  return rows
    .map((row) => slimCatalogEntry(row, tagsMaps))
    .sort((a, b) => a.defaultSort - b.defaultSort);
}
