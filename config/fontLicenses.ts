/**
 * Справочник лицензий шрифтов (фильтр каталога + база знаний /help).
 */

export type FontLicenseFlags = {
  /** Можно в коммерческих проектах (веб, макеты, брендинг). */
  commercialUse: boolean;
  /** Можно отдавать файлы пользователям (ZIP с сайта). */
  redistribute: boolean;
  /** Non-commercial — только личное / некоммерческое. */
  nonCommercial: boolean;
  /** Copyleft (GPL и т.п.) — осторожно с встраиванием в продукт. */
  copyleft: boolean;
};

export type FontLicenseDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  summary: string;
  flags: FontLicenseFlags;
  /** Порядок в фильтре каталога (меньше — выше). */
  filterOrder: number;
};

export const FONT_LICENSE_DEFINITIONS: FontLicenseDefinition[] = [
  {
    id: 'sil-ofl-1.1',
    label: 'SIL Open Font License 1.1',
    shortLabel: 'SIL OFL 1.1',
    summary:
      'Свободная лицензия для шрифтов: можно использовать в коммерческих проектах, вебе и приложениях. При распространении файлов сохраняйте текст лицензии и не продавайте шрифт отдельно как товар.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 10,
  },
  {
    id: 'apache-2.0',
    label: 'Apache License 2.0',
    shortLabel: 'Apache 2.0',
    summary:
      'Разрешает коммерческое использование и модификации при сохранении уведомлений об авторских правах и текста лицензии.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 20,
  },
  {
    id: 'mit',
    label: 'MIT License',
    shortLabel: 'MIT',
    summary: 'Пермиссивная лицензия: коммерческое использование разрешено при указании copyright и текста лицензии.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 30,
  },
  {
    id: 'ubuntu-1.0',
    label: 'Ubuntu Font License 1.0',
    shortLabel: 'Ubuntu 1.0',
    summary: 'Лицензия семейства Ubuntu: коммерческое использование с условиями, описанными в тексте лицензии.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 40,
  },
  {
    id: 'cc0-1.0',
    label: 'CC0 1.0 Universal',
    shortLabel: 'CC0 1.0',
    summary: 'Максимально свободное отказ от прав: можно использовать почти без ограничений, включая коммерцию.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 50,
  },
  {
    id: 'cc-by-3.0',
    label: 'Creative Commons BY 3.0',
    shortLabel: 'CC BY 3.0',
    summary: 'Нужно указать авторство. Коммерческое использование обычно разрешено.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 60,
  },
  {
    id: 'cc-by-4.0',
    label: 'Creative Commons BY 4.0',
    shortLabel: 'CC BY 4.0',
    summary: 'Нужно указать авторство. Коммерческое использование обычно разрешено.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 61,
  },
  {
    id: 'cc-by-sa-3.0',
    label: 'Creative Commons BY-SA 3.0',
    shortLabel: 'CC BY-SA 3.0',
    summary: 'Указание авторства и «Share Alike» — производные на тех же условиях.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 70,
  },
  {
    id: 'cc-by-sa-4.0',
    label: 'Creative Commons BY-SA 4.0',
    shortLabel: 'CC BY-SA 4.0',
    summary: 'Указание авторства и Share Alike для производных работ.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: false },
    filterOrder: 71,
  },
  {
    id: 'cc-by-nd-3.0',
    label: 'Creative Commons BY-ND 3.0',
    shortLabel: 'CC BY-ND 3.0',
    summary: 'Можно использовать с указанием авторства, но без изменения произведения.',
    flags: { commercialUse: true, redistribute: false, nonCommercial: false, copyleft: false },
    filterOrder: 80,
  },
  {
    id: 'cc-by-nd-4.0',
    label: 'Creative Commons BY-ND 4.0',
    shortLabel: 'CC BY-ND 4.0',
    summary: 'Использование с авторством, без создания производных версий шрифта.',
    flags: { commercialUse: true, redistribute: false, nonCommercial: false, copyleft: false },
    filterOrder: 81,
  },
  {
    id: 'cc-by-nc-3.0',
    label: 'Creative Commons BY-NC 3.0',
    shortLabel: 'CC BY-NC 3.0',
    summary: 'Только некоммерческое использование + указание авторства.',
    flags: { commercialUse: false, redistribute: false, nonCommercial: true, copyleft: false },
    filterOrder: 90,
  },
  {
    id: 'cc-by-nc-sa-3.0',
    label: 'Creative Commons BY-NC-SA 3.0',
    shortLabel: 'CC BY-NC-SA 3.0',
    summary: 'Некоммерческое использование, авторство, Share Alike.',
    flags: { commercialUse: false, redistribute: false, nonCommercial: true, copyleft: false },
    filterOrder: 91,
  },
  {
    id: 'cc-by-nc-nd-3.0',
    label: 'Creative Commons BY-NC-ND 3.0',
    shortLabel: 'CC BY-NC-ND 3.0',
    summary: 'Некоммерческое, без производных, с указанием авторства.',
    flags: { commercialUse: false, redistribute: false, nonCommercial: true, copyleft: false },
    filterOrder: 92,
  },
  {
    id: 'gpl-2.0',
    label: 'GNU GPL 2.0',
    shortLabel: 'GPL 2.0',
    summary: 'Copyleft: при распространении производных нужно открывать исходники на тех же условиях.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: true },
    filterOrder: 100,
  },
  {
    id: 'gpl-3.0',
    label: 'GNU GPL 3.0',
    shortLabel: 'GPL 3.0',
    summary: 'Copyleft с условиями GPL v3 — проверяйте совместимость с вашим продуктом.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: true },
    filterOrder: 101,
  },
  {
    id: 'lgpl-3.0',
    label: 'GNU LGPL 3.0',
    shortLabel: 'LGPL 3.0',
    summary: 'Слабый copyleft: чаще применим к библиотекам; для шрифтов читайте текст лицензии.',
    flags: { commercialUse: true, redistribute: true, nonCommercial: false, copyleft: true },
    filterOrder: 102,
  },
  {
    id: 'itf-ffl',
    label: 'ITF Free Font License (Fontshare)',
    shortLabel: 'ITF FFL',
    summary:
      'Лицензия Indian Type Foundry для Fontshare: обычно разрешён веб и макеты, но не всегда повторная раздача файлов. Проверьте FFL на fontshare.com.',
    flags: { commercialUse: true, redistribute: false, nonCommercial: false, copyleft: false },
    filterOrder: 200,
  },
  {
    id: 'trial',
    label: 'Trial / демо',
    shortLabel: 'Trial',
    summary: 'Пробная версия с ограничениями правообладателя. Не для коммерческой публикации без покупки.',
    flags: { commercialUse: false, redistribute: false, nonCommercial: false, copyleft: false },
    filterOrder: 210,
  },
  {
    id: 'unknown',
    label: 'Лицензия не указана',
    shortLabel: 'Не указана',
    summary: 'В метаданных каталога нет явной лицензии. Проверьте сайт автора перед коммерческим использованием.',
    flags: { commercialUse: false, redistribute: false, nonCommercial: false, copyleft: false },
    filterOrder: 999,
  },
];

export const FONT_LICENSE_BY_ID = Object.fromEntries(
  FONT_LICENSE_DEFINITIONS.map((def) => [def.id, def]),
) as Record<string, FontLicenseDefinition>;

export const CATALOG_LICENSE_FILTER_ORDER: string[] = [...FONT_LICENSE_DEFINITIONS]
  .sort((a, b) => a.filterOrder - b.filterOrder)
  .map((d) => d.id);

export const CATALOG_LICENSE_LABELS_RU: Record<string, string> = Object.fromEntries(
  FONT_LICENSE_DEFINITIONS.map((d) => [d.id, d.shortLabel]),
);
