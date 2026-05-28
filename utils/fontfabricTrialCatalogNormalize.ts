/** Нормализация семейств Fontfabric (WP REST → trial-каталог). */

import { parseFontfabricStyleCountFromWpContent } from './fontfabricStyleCount';

const CATEGORY_SLUG_TO_LABEL: Record<string, string> = {
  sans: 'Sans Serif',
  serif: 'Serif',
  display: 'Display',
  script: 'Script',
  mono: 'Monospace',
  rust: 'Rust',
};

export type FontfabricTrialCatalogItem = {
  id: string;
  slug: string;
  family: string;
  label: string;
  foundry: string;
  category: string;
  trialUrl: string;
  note: string;
  styleCount: number;
  source: 'fontfabric-trial';
  licenseType: 'trial';
  canRedistribute: false;
  isVariable: boolean;
  hasItalic: true;
  subsets: string[];
};

type WpTrialProductRow = {
  slug?: string;
  title?: { rendered?: string } | string;
  link?: string;
  class_list?: string[];
  content?: { rendered?: string };
};

function stripHtml(text: unknown): string {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryFromClassList(classList: string[] | undefined): string {
  const list = Array.isArray(classList) ? classList : [];
  const hit = list.find((c) => String(c).startsWith('product_cat-'));
  if (!hit) return 'Display';
  const slug = String(hit).slice('product_cat-'.length).trim().toLowerCase();
  return CATEGORY_SLUG_TO_LABEL[slug] || slug.replace(/-/g, ' ');
}

function isVariableFromClassList(classList: string[] | undefined): boolean {
  const list = Array.isArray(classList) ? classList : [];
  return list.some((c) => String(c) === 'product_tag-variable-fonts');
}

export function normalizeFontfabricTrialProduct(row: WpTrialProductRow | null | undefined): FontfabricTrialCatalogItem | null {
  if (!row || typeof row !== 'object') return null;
  const slug = String(row.slug || '').trim();
  const titleRendered =
    row.title && typeof row.title === 'object' && 'rendered' in row.title
      ? row.title.rendered
      : row.title;
  const family = stripHtml(titleRendered);
  const trialUrl = String(row.link || '').trim();
  if (!slug || !family || !trialUrl.includes('/fonts/')) return null;

  return {
    id: slug,
    slug,
    family,
    label: family,
    foundry: 'Fontfabric',
    category: categoryFromClassList(row.class_list),
    trialUrl,
    note: 'Trial — скачивание на fontfabric.com (Non-Commercial EULA)',
    styleCount: parseFontfabricStyleCountFromWpContent(row.content?.rendered),
    source: 'fontfabric-trial',
    licenseType: 'trial',
    canRedistribute: false,
    isVariable: isVariableFromClassList(row.class_list),
    hasItalic: true,
    subsets: ['latin', 'cyrillic'],
  };
}

export function normalizeFontfabricTrialProducts(rows: unknown): FontfabricTrialCatalogItem[] {
  const bySlug = new Map<string, FontfabricTrialCatalogItem>();
  for (const row of Array.isArray(rows) ? rows : []) {
    const item = normalizeFontfabricTrialProduct(row as WpTrialProductRow);
    if (item) bySlug.set(item.slug, item);
  }
  const items = [...bySlug.values()];
  items.sort((a, b) =>
    String(a.family || '').localeCompare(String(b.family || ''), 'ru', { sensitivity: 'base' }),
  );
  return items;
}
