/** Вкладки внутри экрана «Все шрифты»: единый каталог + пользовательские библиотеки */
export const LIBRARY_MAIN_TABS = [{ id: 'catalog', label: 'Каталог' }];

export const CATALOG_SOURCE_OPTIONS = [
  { value: 'google', label: 'Google' },
  { value: 'fontsource', label: 'Fontsource' },
];

export const LIBRARY_FONT_SCOPE_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'recent', label: 'Новые' },
  { id: 'local', label: 'С диска' },
  { id: 'google', label: 'Google' },
  { id: 'fontsource', label: 'Fontsource' },
];

export const FONTSOURCE_PREWARM_LIMIT = 24;
export const FONTSOURCE_PREWARM_CONCURRENCY = 2;
export const FONTSOURCE_PREWARM_DELAY_MS = 1200;
