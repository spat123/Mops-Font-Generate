/** Нормализация записи каталога Fontshare (API v2). */

import { normalizeFontLicenseId } from './fontLicenseNormalize';

export type FontshareStyleRow = {
  id: string;
  file: string;
  isItalic: boolean;
  isVariable: boolean;
  weight: number;
  weightLabel: string;
};

export type FontshareCatalogItem = {
  id: string;
  slug: string;
  family: string;
  label: string;
  category: string;
  licenseType: string;
  license: string;
  canRedistribute: boolean;
  trialsEnabled: boolean;
  subsets: string[];
  weights: number[];
  styles: Array<'normal' | 'italic'>;
  styleRows: FontshareStyleRow[];
  isVariable: boolean;
  hasItalic: boolean;
  styleCount: number;
  popularityScore: number;
  source: 'fontshare';
  downloadUrl: string;
  pageUrl: string;
};

type RawFontshareStyle = {
  id?: string;
  file?: string;
  is_italic?: boolean;
  is_variable?: boolean;
  weight?: { weight?: number; number?: number; label?: string; name?: string };
};

function normalizeStyleRow(style: RawFontshareStyle | null | undefined): FontshareStyleRow | null {
  if (!style || typeof style !== 'object') return null;
  const file = String(style.file || '').trim();
  if (!file) return null;
  const weightObj = style.weight && typeof style.weight === 'object' ? style.weight : {};
  const weightNum = Number(weightObj.weight ?? weightObj.number ?? 400);
  return {
    id: String(style.id || '').trim(),
    file: file.startsWith('//') ? `https:${file}` : file,
    isItalic: Boolean(style.is_italic),
    isVariable: Boolean(style.is_variable),
    weight: Number.isFinite(weightNum) ? weightNum : 400,
    weightLabel: String(weightObj.label || weightObj.name || '').trim(),
  };
}

export function normalizeFontshareCatalogItem(row: Record<string, unknown> | null | undefined): FontshareCatalogItem | null {
  if (!row || typeof row !== 'object') return null;
  const slug = String(row.slug || '').trim();
  const family = String(row.name || row.family || '').trim();
  if (!slug || !family) return null;

  const styles = (Array.isArray(row.styles) ? row.styles : [])
    .map((s) => normalizeStyleRow(s as RawFontshareStyle))
    .filter((s): s is FontshareStyleRow => s != null);
  const weights = [...new Set(styles.map((s) => s.weight))].sort((a, b) => a - b);
  const hasItalic = styles.some((s) => s.isItalic);
  const isVariable = styles.some((s) => s.isVariable) || (Array.isArray(row.axes) && row.axes.length > 0);
  const licenseType = String(row.license_type || 'itf_ffl').trim();
  const license =
    licenseType === 'sil_ofl'
      ? 'sil-ofl-1.1'
      : licenseType === 'itf_ffl'
        ? 'itf-ffl'
        : normalizeFontLicenseId(licenseType);

  return {
    id: slug,
    slug,
    family,
    label: family,
    category: String(row.category || ''),
    licenseType,
    license,
    canRedistribute: licenseType === 'sil_ofl',
    trialsEnabled: Boolean(row.trials_enabled),
    subsets: row.script ? [String(row.script)] : ['latin'],
    weights,
    styles: styles.map((s) => (s.isItalic ? 'italic' : 'normal')),
    styleRows: styles,
    isVariable,
    hasItalic,
    styleCount: Math.max(1, styles.length),
    popularityScore: Number(row.views_recent) || Number(row.views) || 0,
    source: 'fontshare',
    downloadUrl: `https://api.fontshare.com/v2/fonts/download/${encodeURIComponent(slug)}`,
    pageUrl: `https://www.fontshare.com/fonts/${encodeURIComponent(slug)}`,
  };
}

export function normalizeFontshareCatalogItems(rows: unknown): FontshareCatalogItem[] {
  const normalized = (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeFontshareCatalogItem(row as Record<string, unknown>))
    .filter((item): item is FontshareCatalogItem => item != null);
  normalized.sort((a, b) => {
    const byPop = (Number(b.popularityScore) || 0) - (Number(a.popularityScore) || 0);
    if (byPop !== 0) return byPop;
    return String(a.family || '').localeCompare(String(b.family || ''), 'ru', { sensitivity: 'base' });
  });
  return normalized;
}

/** Предпочтительное начертание для превью / открытия в редакторе. */
export function pickFontsharePreviewStyle(
  item: { styleRows?: FontshareStyleRow[] } | null | undefined,
): FontshareStyleRow | null {
  const rows = Array.isArray(item?.styleRows) ? item.styleRows : [];
  if (rows.length === 0) return null;
  const regular400 = rows.find((s) => !s.isItalic && s.weight === 400);
  if (regular400) return regular400;
  const anyNormal = rows.find((s) => !s.isItalic);
  if (anyNormal) return anyNormal;
  return rows[0];
}
