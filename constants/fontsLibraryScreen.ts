export type LibraryMainTab = { id: 'catalog'; label: string };

/** Вкладки внутри экрана «Все шрифты»: единый каталог + пользовательские библиотеки */
export const LIBRARY_MAIN_TABS: LibraryMainTab[] = [{ id: 'catalog', label: 'Каталог' }];

export type CatalogSourceFilterId = 'all' | 'google' | 'fontsource' | 'fontshare' | 'demo';

export type CatalogSourceFilterTab = { id: CatalogSourceFilterId; label: string };

/** Вкладки фильтра источника в едином каталоге (id «all» — без badge в селекте). */
export const CATALOG_SOURCE_FILTER_TABS: CatalogSourceFilterTab[] = [
  { id: 'all', label: 'Все шрифты' },
  { id: 'google', label: 'Google' },
  { id: 'fontsource', label: 'Fontsource' },
  { id: 'fontshare', label: 'Fontshare' },
  { id: 'demo', label: 'Trial' },
];

export type LibraryFontScopeId = 'all' | 'recent' | 'local' | 'dynamic';

export type LibraryFontScopeTab = { id: LibraryFontScopeId; label: string };

export const LIBRARY_FONT_SCOPE_TABS: LibraryFontScopeTab[] = [
  { id: 'all', label: 'Все' },
  { id: 'recent', label: 'Новые' },
  { id: 'local', label: 'С диска' },
  { id: 'dynamic', label: 'Dynamic Font' },
];

export const FONTSOURCE_PREWARM_LIMIT = 24;
export const FONTSOURCE_PREWARM_CONCURRENCY = 2;
export const FONTSOURCE_PREWARM_DELAY_MS = 1200;
