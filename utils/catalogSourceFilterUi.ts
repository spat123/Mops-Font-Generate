import type { CatalogSourceFilterId } from '../constants/fontsLibraryScreen';
import { CATALOG_SOURCE_FILTER_TABS } from '../constants/fontsLibraryScreen';
import { pluralRu } from './pluralRu';

export type CatalogSourceFilterCounts = Partial<Record<CatalogSourceFilterId, number>>;

export type CatalogSourceFilterOption = {
  value: CatalogSourceFilterId;
  label: string;
  triggerLabel: string;
  rightLabel?: string;
  searchText: string;
};

function badgeCount(count: unknown): number {
  const n = Number(count);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function buildCatalogSourceFilterOptions(
  counts: CatalogSourceFilterCounts | null | undefined,
): CatalogSourceFilterOption[] {
  const c = counts || {};
  return CATALOG_SOURCE_FILTER_TABS.map((tab) => {
    const n = badgeCount(c[tab.id]);
    return {
      value: tab.id,
      label: tab.label,
      triggerLabel: tab.label,
      ...(tab.id === 'all' ? {} : { rightLabel: String(n) }),
      searchText: `${tab.label} ${n} ${pluralRu(n, 'шрифт', 'шрифта', 'шрифтов')}`,
    };
  });
}
