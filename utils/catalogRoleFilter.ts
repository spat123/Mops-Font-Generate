import { canonicalFontCategoryKey } from './fontCategoryLabels';
import type { CatalogSearchableItem } from '../types/catalog';

/** Акцидентные / display — типично для заголовков. */
export const CATALOG_ROLE_HEADING_CATEGORIES = ['display'] as const;

/** Основной текст: гротески, антиквы, брусковые. */
export const CATALOG_ROLE_TEXT_CATEGORIES = ['sans-serif', 'serif', 'slab-serif'] as const;

export const CATALOG_ROLE_FILTER_HEADING = 'heading';
export const CATALOG_ROLE_FILTER_TEXT = 'text';

export const CATALOG_ROLE_FILTER_OPTIONS = [
  { value: CATALOG_ROLE_FILTER_HEADING, label: 'Заголовки' },
  { value: CATALOG_ROLE_FILTER_TEXT, label: 'Текст' },
] as const;

export function catalogItemMatchesRoleFilter(
  item: CatalogSearchableItem | null | undefined,
  {
    filterRole = '',
    getCategory,
  }: {
    filterRole?: string;
    getCategory?: (item: CatalogSearchableItem) => string | undefined;
  },
): boolean {
  const role = String(filterRole || '').trim();
  if (!role) return true;

  const category = canonicalFontCategoryKey(
    typeof getCategory === 'function' ? getCategory(item as CatalogSearchableItem) : item?.category,
  );
  if (!category) return false;

  if (role === CATALOG_ROLE_FILTER_HEADING) {
    return (CATALOG_ROLE_HEADING_CATEGORIES as readonly string[]).includes(category);
  }
  if (role === CATALOG_ROLE_FILTER_TEXT) {
    return (CATALOG_ROLE_TEXT_CATEGORIES as readonly string[]).includes(category);
  }
  return false;
}
