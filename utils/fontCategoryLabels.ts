const FONT_CATEGORY_LABELS_RU: Record<string, string> = {
  display: 'Акцидентные',
  handwriting: 'Рукописные',
  monospace: 'Моноширинные',
  'sans-serif': 'Гротески',
  serif: 'Антиквы',
  'slab-serif': 'Брусковые',
};

const CATEGORY_FILTER_ORDER = [
  'sans-serif',
  'serif',
  'slab-serif',
  'display',
  'handwriting',
  'monospace',
];

export type CatalogCategoryRaw = {
  category?: string;
  stroke?: string;
  hasSlab?: boolean;
  family?: string;
  label?: string;
  name?: string;
  id?: string;
  slug?: string;
};

/** Единый ключ категории: «Sans Serif», sans-serif → sans-serif. */
export function normalizeFontCategoryKey(category: unknown): string {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
}

/** Канонический ключ только для известных категорий каталога. */
export function canonicalFontCategoryKey(category: unknown): string {
  const key = normalizeFontCategoryKey(category);
  return FONT_CATEGORY_LABELS_RU[key] ? key : '';
}

export function getFontCategoryLabelRu(category: unknown): string {
  const normalized = normalizeFontCategoryKey(category);
  return FONT_CATEGORY_LABELS_RU[normalized] || String(category || '').trim();
}

export function compareFontCategoryLabelsRu(a: unknown, b: unknown): number {
  const ia = CATEGORY_FILTER_ORDER.indexOf(normalizeFontCategoryKey(a));
  const ib = CATEGORY_FILTER_ORDER.indexOf(normalizeFontCategoryKey(b));
  const ra = ia >= 0 ? ia : 999;
  const rb = ib >= 0 ? ib : 999;
  if (ra !== rb) return ra - rb;
  return getFontCategoryLabelRu(a).localeCompare(getFontCategoryLabelRu(b), 'ru', {
    sensitivity: 'base',
  });
}

/** Категория каталога: stroke Slab Serif и теги /Slab/ → брусковые. */
export function resolveCatalogCategory(raw: CatalogCategoryRaw | null | undefined): string {
  if (!raw || typeof raw !== 'object') return '';

  const strokeKey = normalizeFontCategoryKey(raw.stroke);
  if (strokeKey === 'slab-serif') return 'slab-serif';
  if (raw.hasSlab === true) return 'slab-serif';

  const family = String(raw.family || raw.label || raw.name || '').trim();
  const slug = String(raw.id || raw.slug || '').trim();
  if (/\bslab\b/i.test(family) || /(^|[-_])slab($|[-_])/i.test(slug)) {
    return 'slab-serif';
  }

  return canonicalFontCategoryKey(raw.category);
}

/** Категория merged-item: slab-serif не теряется из-за Fontsource sans/serif. */
export function resolveMergedCatalogCategory(
  sources: Array<{ raw?: CatalogCategoryRaw }> | null | undefined,
): string {
  const list = Array.isArray(sources) ? sources : [];
  for (const s of list) {
    if (resolveCatalogCategory(s?.raw) === 'slab-serif') return 'slab-serif';
  }
  for (const s of list) {
    const c = resolveCatalogCategory(s?.raw);
    if (c) return c;
  }
  return '';
}
