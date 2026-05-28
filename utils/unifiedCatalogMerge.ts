import { slugifyFontKey } from './fontSlug';
import { resolveMergedCatalogCategory } from './fontCategoryLabels';
import { CATALOG_FEELING_FILTER_ORDER } from './catalogFeelingFilter';
import { CATALOG_SHAPE_FILTER_ORDER } from './catalogShapeFilter';
import { CATALOG_CALLIGRAPHY_FILTER_ORDER } from './catalogCalligraphyFilter';
import {
  createCatalogLibraryEntry,
  isFontshareFontInSession,
  isFontsourceFontInSession,
  isGoogleFontInSession,
} from './fontLibraryUtils';
import type {
  CatalogRow,
  CatalogSourceId,
  CatalogSourceLike,
  CatalogSourceRef,
  CatalogUnifiedItem,
  MergedCatalogItem,
  UnifiedCatalogSource,
} from '../types/catalog';
import type { SessionFontRecord } from '../types/editorFonts';

function toList<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

function nonEmptyString(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : '';
}

function uniqueStrings(list: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of toList(list)) {
    const s = nonEmptyString(x);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function getFamilyLabelForSource(sourceId: CatalogSourceId | string, row: CatalogRow): string {
  if (!row || typeof row !== 'object') return '';
  if (sourceId === 'google') return nonEmptyString(row.family);
  if (sourceId === 'fontsource') {
    return nonEmptyString(row.family || row.label || row.name || row.id || row.slug);
  }
  if (sourceId === 'fontshare' || sourceId === 'demo') {
    return nonEmptyString(row.family || row.name || row.label || row.slug);
  }
  return nonEmptyString(row.family || row.label || row.name || row.id || row.slug);
}

function getFamilyKeyForSource(sourceId: CatalogSourceId | string, row: CatalogRow): string {
  const label = getFamilyLabelForSource(sourceId, row);
  return label ? slugifyFontKey(label) : '';
}

function boolAny(...vals: unknown[]): boolean {
  return vals.some(Boolean);
}

function numberMax(...vals: unknown[]): number {
  let max = 0;
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function buildUnifiedSource(sourceId: CatalogSourceId, row: CatalogRow): UnifiedCatalogSource {
  const licenseType = nonEmptyString(row?.licenseType);
  const canRedistribute = row?.canRedistribute === true;
  const isFontshare = sourceId === 'fontshare';
  const isFontfabricTrial = sourceId === 'demo';

  const canOpenInEditor = sourceId === 'google' || sourceId === 'fontsource';
  const canDownloadHere = !isFontfabricTrial && (!isFontshare || canRedistribute || licenseType === 'sil_ofl');

  return {
    id: sourceId,
    raw: row,
    family: getFamilyLabelForSource(sourceId, row),
    familyKey: getFamilyKeyForSource(sourceId, row),
    licenseType,
    canRedistribute,
    canOpenInEditor,
    canDownloadHere,
  };
}

function shouldHideFontshareItfFfl({
  hasGoogleOrFontsource,
  fontshareRow,
}: {
  hasGoogleOrFontsource: boolean;
  fontshareRow: CatalogRow | null;
}): boolean {
  if (!hasGoogleOrFontsource) return false;
  const licenseType = nonEmptyString(fontshareRow?.licenseType);
  const canRedistribute = fontshareRow?.canRedistribute === true;
  return licenseType === 'itf_ffl' && !canRedistribute;
}

function shouldHideFontfabricTrial(hasGoogleOrFontsource: boolean): boolean {
  return Boolean(hasGoogleOrFontsource);
}

function aggregateUnifiedItem({
  familyKey,
  sources,
}: {
  familyKey: string;
  sources: UnifiedCatalogSource[];
}): MergedCatalogItem {
  const orderedSources = [...sources];
  const primarySource = orderedSources[0]?.id || '';

  const primaryRaw = orderedSources[0]?.raw || null;
  const displayName =
    nonEmptyString(primaryRaw?.family) ||
    nonEmptyString(primaryRaw?.label) ||
    nonEmptyString(primaryRaw?.name) ||
    nonEmptyString(primaryRaw?.slug) ||
    familyKey;

  const category = resolveMergedCatalogCategory(orderedSources);

  const subsets = uniqueStrings(orderedSources.flatMap((s) => toList(s?.raw?.subsets as string[])));

  const isVariable = boolAny(...orderedSources.map((s) => Boolean(s?.raw?.isVariable)));
  const hasItalic = boolAny(...orderedSources.map((s) => Boolean(s?.raw?.hasItalic)));
  const styleCount = numberMax(
    ...orderedSources
      .filter((s) => s?.id !== 'demo')
      .map((s) => Number(s?.raw?.styleCount) || 0),
  );

  const feelingSet = new Set<string>();
  const shapeSet = new Set<string>();
  const calligraphySet = new Set<string>();
  for (const s of orderedSources) {
    const feelList = Array.isArray(s?.raw?.feelings) ? (s.raw.feelings as string[]) : [];
    for (const feel of feelList) {
      const k = String(feel || '').trim();
      if (k) feelingSet.add(k);
    }
    const shapeList = Array.isArray(s?.raw?.shapes) ? (s.raw.shapes as string[]) : [];
    for (const shape of shapeList) {
      const k = String(shape || '').trim();
      if (k) shapeSet.add(k);
    }
    const calligraphyList = Array.isArray(s?.raw?.calligraphy) ? (s.raw.calligraphy as string[]) : [];
    for (const style of calligraphyList) {
      const k = String(style || '').trim();
      if (k) calligraphySet.add(k);
    }
  }

  return {
    familyKey,
    displayName,
    category,
    feelings: CATALOG_FEELING_FILTER_ORDER.filter((k) => feelingSet.has(k)),
    shapes: CATALOG_SHAPE_FILTER_ORDER.filter((k) => shapeSet.has(k)),
    calligraphy: CATALOG_CALLIGRAPHY_FILTER_ORDER.filter((k) => calligraphySet.has(k)),
    subsets,
    isVariable,
    hasItalic,
    styleCount,
    sources: orderedSources,
    primarySource,
  };
}

type SourceSlot = {
  familyKey: string;
  google: UnifiedCatalogSource | null;
  fontsource: UnifiedCatalogSource | null;
  fontshare: UnifiedCatalogSource | null;
  demo: UnifiedCatalogSource | null;
};

export function mergeCatalogSources({
  googleItems,
  fontsourceItems,
  fontshareItems,
  trialItems,
}: {
  googleItems?: CatalogRow[];
  fontsourceItems?: CatalogRow[];
  fontshareItems?: CatalogRow[];
  trialItems?: CatalogRow[];
} = {}): MergedCatalogItem[] {
  const g = toList(googleItems);
  const fs = toList(fontsourceItems);
  const fsh = toList(fontshareItems);
  const demo = toList(trialItems);

  const byKey = new Map<string, SourceSlot>();

  const pushSource = (sourceId: CatalogSourceId, row: CatalogRow) => {
    const familyKey = getFamilyKeyForSource(sourceId, row);
    if (!familyKey) return;
    const entry = buildUnifiedSource(sourceId, row);
    if (!entry.familyKey) return;

    if (!byKey.has(familyKey)) {
      byKey.set(familyKey, {
        familyKey,
        google: null,
        fontsource: null,
        fontshare: null,
        demo: null,
      });
    }
    const slot = byKey.get(familyKey)!;
    if (sourceId === 'google') slot.google = entry;
    else if (sourceId === 'fontsource') slot.fontsource = entry;
    else if (sourceId === 'fontshare') slot.fontshare = entry;
    else if (sourceId === 'demo') slot.demo = entry;
  };

  g.forEach((row) => pushSource('google', row));
  fs.forEach((row) => pushSource('fontsource', row));
  fsh.forEach((row) => pushSource('fontshare', row));
  demo.forEach((row) => pushSource('demo', row));

  const merged: MergedCatalogItem[] = [];
  for (const slot of byKey.values()) {
    const hasGoogleOrFontsource = Boolean(slot.google || slot.fontsource);
    const sources: UnifiedCatalogSource[] = [];

    if (slot.fontsource) sources.push(slot.fontsource);
    if (slot.google) sources.push(slot.google);

    if (slot.fontshare) {
      const hide = shouldHideFontshareItfFfl({
        hasGoogleOrFontsource,
        fontshareRow: slot.fontshare.raw,
      });
      if (!hide) sources.push(slot.fontshare);
    }

    if (slot.demo && !shouldHideFontfabricTrial(hasGoogleOrFontsource)) {
      sources.push(slot.demo);
    }

    if (sources.length === 0) continue;
    merged.push(aggregateUnifiedItem({ familyKey: slot.familyKey, sources }));
  }

  merged.sort((a, b) =>
    String(a.displayName || '').localeCompare(String(b.displayName || ''), 'ru', { sensitivity: 'base' }),
  );

  return merged;
}

export function bestDownloadSourceId(item: MergedCatalogItem | CatalogUnifiedItem): string {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const fontsource = sources.find((s) => s?.id === 'fontsource');
  if (fontsource) return 'fontsource';
  const google = sources.find((s) => s?.id === 'google');
  if (google) return 'google';
  const fontshare = sources.find((s) => s?.id === 'fontshare') as UnifiedCatalogSource | undefined;
  if (fontshare?.canDownloadHere) return 'fontshare';
  const demo = sources.find((s) => s?.id === 'demo');
  if (demo) return 'demo';
  return sources[0]?.id || '';
}

/** Превью на карточке: Google CSS быстрее, чем woff2 через Fontsource API. */
export function bestPreviewSourceId(item: MergedCatalogItem | CatalogUnifiedItem): string {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const google = sources.find((s) => s?.id === 'google');
  if (google) return 'google';
  const fontsource = sources.find((s) => s?.id === 'fontsource');
  if (fontsource) return 'fontsource';
  const fontshare = sources.find((s) => s?.id === 'fontshare');
  if (fontshare) return 'fontshare';
  const demo = sources.find((s) => s?.id === 'demo');
  if (demo) return 'demo';
  return sources[0]?.id || '';
}

export function getCatalogSourceRef(
  item: MergedCatalogItem | CatalogUnifiedItem,
  sourceId: string,
): CatalogSourceLike | null {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  return sources.find((s) => s?.id === sourceId) || sources[0] || null;
}

export function buildUnifiedLibraryEntry(item: MergedCatalogItem | CatalogUnifiedItem) {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const sourceId = item?.primarySource || bestDownloadSourceId(item);
  const src = sources.find((s) => s?.id === sourceId) || sources[0] || null;
  const raw = (src?.raw || null) as CatalogRow | null;
  const label =
    item?.displayName ||
    src?.family ||
    nonEmptyString(raw?.family) ||
    nonEmptyString(raw?.label) ||
    nonEmptyString(raw?.slug) ||
    item?.familyKey;
  const isVariable = Boolean(item?.isVariable);

  if (sourceId === 'google') {
    const family = nonEmptyString(raw?.family) || label;
    return createCatalogLibraryEntry({ source: 'google', key: family, label: family, isVariable });
  }
  if (sourceId === 'fontsource') {
    const slug = nonEmptyString(raw?.id) || nonEmptyString(raw?.slug);
    return createCatalogLibraryEntry({ source: 'fontsource', key: slug, label, isVariable });
  }
  if (sourceId === 'fontshare') {
    const slug = nonEmptyString(raw?.id) || nonEmptyString(raw?.slug);
    return createCatalogLibraryEntry({ source: 'fontshare', key: slug, label, isVariable });
  }
  if (sourceId === 'demo') {
    const slug = nonEmptyString(raw?.slug) || nonEmptyString(raw?.id);
    return createCatalogLibraryEntry({ source: 'fontfabric-trial', key: slug, label, isVariable });
  }
  return createCatalogLibraryEntry({ source: 'google', key: label, label, isVariable });
}

export function isCatalogSourceInSession(
  fonts: SessionFontRecord[],
  sourceId: string,
  raw: CatalogRow | null,
  displayName = '',
): boolean {
  if (!raw || typeof raw !== 'object') return false;
  if (sourceId === 'google') {
    const family = nonEmptyString(raw.family) || nonEmptyString(displayName);
    return family ? isGoogleFontInSession(fonts, family) : false;
  }
  if (sourceId === 'fontsource') {
    const slug = nonEmptyString(raw.id) || nonEmptyString(raw.slug);
    return slug ? isFontsourceFontInSession(fonts, slug) : false;
  }
  if (sourceId === 'fontshare') {
    const slug = nonEmptyString(raw.id) || nonEmptyString(raw.slug);
    return slug ? isFontshareFontInSession(fonts, slug) : false;
  }
  return false;
}

function isActionableCatalogSource(source: UnifiedCatalogSource | CatalogSourceRef): boolean {
  if (!source?.id || !source?.raw) return false;
  if (source.id === 'demo') return false;
  const u = source as UnifiedCatalogSource;
  return Boolean(u.canOpenInEditor || u.canDownloadHere);
}

export function isUnifiedCatalogItemFullyInSession(
  fonts: SessionFontRecord[],
  item: MergedCatalogItem | CatalogUnifiedItem,
): boolean {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const actionable = sources.filter(isActionableCatalogSource);
  if (actionable.length === 0) return false;
  const displayName = item?.displayName || '';
  return actionable.every((s) =>
    isCatalogSourceInSession(fonts, s.id, (s.raw || null) as CatalogRow | null, displayName),
  );
}

export function buildSingleSourceUnifiedItem(
  sourceId: CatalogSourceId,
  row: CatalogRow,
): MergedCatalogItem | null {
  const familyKey = getFamilyKeyForSource(sourceId, row);
  if (!familyKey) return null;
  return aggregateUnifiedItem({
    familyKey,
    sources: [buildUnifiedSource(sourceId, row)],
  });
}
