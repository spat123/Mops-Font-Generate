import { slugifyFontKey } from '../utils/fontSlug';
import type { SessionFontRecord } from '../types/editorFonts';
import type { FontNameTable } from '../utils/fontNameTable';

export type FontLicenseColumn = {
  title: string;
  items: string[];
};

export type FontAdditionalInfoRow = {
  label: string;
  value: string;
};

export type FontExternalLink = {
  label: string;
  url: string;
  kind?: 'github' | 'site';
};

export type FontSeoPage = {
  slug: string;
  family: string;
  source: 'google' | 'fontsource';
  openQuery: Record<string, string>;
  title: string;
  seoTitle: string;
  seoDescription: string;
  summary: string;
  description: string[];
  isVariable: boolean;
  styleCount?: number;
  fileCount?: number;
  languageCount?: number;
  glyphCount?: number;
  hasItalic?: boolean;
  licenseName: string;
  licenseDescription: string;
  copyright?: string;
  studio?: string;
  designers?: string[];
  externalLinks?: FontExternalLink[];
  licenseColumns: FontLicenseColumn[];
  additionalInfo: FontAdditionalInfoRow[];
  nameTable?: FontNameTable;
};

const APACHE_2_COLUMNS: FontLicenseColumn[] = [
  {
    title: 'Права доступа',
    items: ['Коммерческое использование', 'Изменение', 'Распространение', 'Персональное использование'],
  },
  {
    title: 'Ограничения',
    items: ['Использование товарного знака', 'Ограничение ответственности', 'Отсутствие гарантий'],
  },
  {
    title: 'Условия',
    items: ['Уведомление о лицензии и авторских правах', 'Документирование изменений'],
  },
];

const OFL_COLUMNS: FontLicenseColumn[] = [
  {
    title: 'Права доступа',
    items: ['Коммерческое использование', 'Изменение', 'Распространение', 'Встраивание в сайты и приложения'],
  },
  {
    title: 'Ограничения',
    items: ['Нельзя продавать шрифт отдельно от ПО', 'Нельзя использовать Reserved Font Name без разрешения'],
  },
  {
    title: 'Условия',
    items: ['Сохранить текст лицензии', 'Указать авторские права', 'Переименовать изменённые версии при необходимости'],
  },
];

function googleQuery(family: string, isVariable = false): Record<string, string> {
  return isVariable ? { openGoogle: family, openGoogleVar: '1', openView: 'plain' } : { openGoogle: family, openView: 'plain' };
}

function fontsourceQuery(slug: string, isVariable = false): Record<string, string> {
  return isVariable
    ? { openFontsource: slug, fontsourceVar: '1', openView: 'plain' }
    : { openFontsource: slug, openView: 'plain' };
}

type CommonLicenseInfo = Pick<
  FontSeoPage,
  'licenseName' | 'licenseDescription' | 'studio' | 'designers' | 'licenseColumns' | 'additionalInfo'
>;

function commonOflInfo(family: string, designer?: string, studio?: string): CommonLicenseInfo {
  const cleanDesigner = String(designer || '').trim();
  const cleanStudio = String(studio || '').trim();
  return {
    licenseName: 'SIL Open Font License 1.1',
    licenseDescription:
      'SIL OFL разрешает использовать, встраивать, изменять и распространять шрифт, включая коммерческие проекты, при сохранении условий лицензии.',
    studio: cleanStudio || undefined,
    designers: cleanDesigner ? [cleanDesigner] : undefined,
    licenseColumns: OFL_COLUMNS,
    additionalInfo: [
      { label: 'Font family', value: family },
      { label: 'Source', value: 'Google Fonts' },
      { label: 'License', value: 'SIL Open Font License 1.1' },
      { label: 'Manufacturer', value: cleanStudio },
      { label: 'Designer', value: cleanDesigner },
    ].filter((item) => item.value),
  };
}

function commonFontsourceLicenseInfo(family: string, licenseId: string): CommonLicenseInfo {
  const normalized = String(licenseId || '').trim().toLowerCase();
  if (normalized.includes('apache')) {
    return {
      licenseName: 'Apache 2.0',
      licenseDescription:
        'Apache License 2.0 разрешает использовать, изменять и распространять шрифт, включая коммерческие проекты, при сохранении уведомлений об авторских правах и лицензии.',
      licenseColumns: APACHE_2_COLUMNS,
      additionalInfo: [
        { label: 'Font family', value: family },
        { label: 'Source', value: 'Fontsource' },
        { label: 'License', value: 'Apache 2.0' },
      ],
    };
  }

  const label = normalized && normalized !== 'unknown' ? licenseId : 'Лицензия указана в Fontsource';
  return {
    licenseName: normalized.includes('ofl') ? 'SIL Open Font License 1.1' : label,
    licenseDescription:
      normalized.includes('ofl')
        ? 'SIL OFL разрешает использовать, встраивать, изменять и распространять шрифт, включая коммерческие проекты, при сохранении условий лицензии.'
        : 'Перед использованием шрифта в коммерческом проекте проверьте условия лицензии в исходном каталоге Fontsource.',
    licenseColumns: normalized.includes('ofl')
      ? OFL_COLUMNS
      : [
          { title: 'Права доступа', items: ['Зависят от лицензии исходного шрифта'] },
          { title: 'Ограничения', items: ['Проверьте условия автора или каталога'] },
          { title: 'Условия', items: ['Сохраняйте текст лицензии и copyright, если они есть'] },
        ],
    additionalInfo: [
      { label: 'Font family', value: family },
      { label: 'Source', value: 'Fontsource' },
      { label: 'License', value: label },
    ],
  };
}

type FontSeoSeed = {
  family: string;
  designer?: string;
  studio?: string;
  isVariable?: boolean;
  hasItalic?: boolean;
  languageCount?: number;
  summary?: string;
  description?: string[];
};

function buildFontSeoTitle(family: string): string {
  return `${family} шрифт онлайн: проверить и скачать | DINAMIC FONT`;
}

function buildFontSeoDescription(family: string): string {
  return `Шрифт ${family}: проверьте текст, кириллицу, начертания, glyphs и Type Scale онлайн. Лицензия, данные из файла шрифта и открытие ${family} в редакторе DINAMIC FONT.`;
}

function buildFontSeoSummary(family: string, sourceLabel: string): string {
  return `${family} шрифт из ${sourceLabel}: онлайн-проверка текста, кириллицы, начертаний, glyphs, Type Scale и лицензии в DINAMIC FONT.`;
}

function buildFontSeoDescriptionBlocks(family: string, supportsCyrillic = true): string[] {
  const cyrillicPart = supportsCyrillic ? 'кириллицу, ' : '';
  return [
    `Шрифт ${family} можно открыть в DINAMIC FONT, чтобы проверить свой текст, ${cyrillicPart}набор начертаний, размеры, glyphs и Type Scale перед использованием в интерфейсе, сайте или брендовой графике.`,
    `На странице ${family} собраны лицензия, условия использования, технические данные из файла шрифта и постоянная ссылка для быстрого открытия шрифта в редакторе.`,
  ];
}

const ROBOTO_PAGE: FontSeoPage = {
  slug: 'roboto',
  family: 'Roboto',
  source: 'google',
  openQuery: googleQuery('Roboto', true),
  title: 'Roboto шрифт',
  seoTitle: buildFontSeoTitle('Roboto'),
  seoDescription: buildFontSeoDescription('Roboto'),
  summary: buildFontSeoSummary('Roboto', 'Google Fonts'),
  description: [
    'Roboto шрифт можно открыть в DINAMIC FONT, чтобы проверить свой текст, кириллицу, набор начертаний, размеры, glyphs и Type Scale перед использованием в интерфейсе, сайте или брендовой графике.',
    'Roboto — одно из самых распространённых семейств для цифровых интерфейсов. На странице доступны лицензия, условия использования, технические данные из файла шрифта и постоянная ссылка для быстрого открытия Roboto в редакторе.',
  ],
  isVariable: true,
  styleCount: 12,
  fileCount: 2,
  languageCount: 71,
  hasItalic: true,
  licenseName: 'Apache 2.0',
  licenseDescription:
    'Apache License 2.0 разрешает коммерческое и некоммерческое использование, изменение и распространение при сохранении уведомлений об авторских правах и лицензии.',
  copyright: 'Copyright 2011 Google Inc. All Rights Reserved.',
  studio: 'Google',
  designers: ['Christian Robertson'],
  externalLinks: [
    { label: 'TypeNetwork/Roboto', url: 'https://github.com/TypeNetwork/Roboto', kind: 'github' },
  ],
  licenseColumns: APACHE_2_COLUMNS,
  additionalInfo: [
    { label: 'Font family', value: 'Roboto' },
    { label: 'Font subfamily', value: 'Regular' },
    { label: 'Identifier', value: 'Roboto' },
    { label: 'Full name', value: 'Roboto' },
    { label: 'Version', value: 'Version 3.004; 2020' },
    { label: 'PostScriptName', value: 'Roboto-Regular' },
    { label: 'Trademark', value: 'Roboto is a trademark of Google.' },
    { label: 'Manufacturer', value: 'Google' },
    { label: 'Designer', value: 'Christian Robertson' },
    { label: 'Vendor URL', value: 'Google.com' },
    { label: 'Designer URL', value: 'Google.com' },
    { label: 'License', value: 'Licensed under the Apache License, Version 2.0' },
    { label: 'License URL', value: 'http://www.apache.org/licenses/LICENSE-2.0' },
  ],
};

const POPULAR_GOOGLE_FONT_SEEDS: FontSeoSeed[] = [
  { family: 'Roboto' },
  {
    family: 'Roboto Flex',
    isVariable: true,
    studio: 'Google',
    summary: 'Roboto Flex — вариативное развитие семейства Roboto с широкими настройками осей.',
    description: [
      'Roboto Flex — вариативный шрифт Google Fonts для гибкой цифровой типографики. Он подходит для интерфейсов, сайтов и экспериментов с осями variable fonts.',
    ],
  },
  { family: 'Open Sans', isVariable: true, hasItalic: true, designer: 'Steve Matteson' },
  { family: 'Noto Sans', isVariable: true, hasItalic: true, studio: 'Google' },
  { family: 'Montserrat', isVariable: true, hasItalic: true, designer: 'Julieta Ulanovsky' },
  { family: 'Lato', hasItalic: true, designer: 'Łukasz Dziedzic' },
  { family: 'Poppins', isVariable: true, hasItalic: true, studio: 'Indian Type Foundry' },
  {
    family: 'Inter',
    isVariable: true,
    hasItalic: true,
    designer: 'Rasmus Andersson',
    summary: 'Inter — популярный UI-шрифт для интерфейсов, сайтов и приложений.',
    description: [
      'Inter — шрифт, спроектированный для экранов и интерфейсов. Он хорошо подходит для длинных текстов, UI-компонентов и продуктовой типографики.',
    ],
  },
  { family: 'Oswald', isVariable: true, designer: 'Vernon Adams' },
  { family: 'Source Sans 3', isVariable: true, hasItalic: true, studio: 'Adobe' },
  { family: 'Raleway', isVariable: true, hasItalic: true, designer: 'Matt McInerney' },
  { family: 'Merriweather', hasItalic: true, designer: 'Sorkin Type' },
  { family: 'Nunito Sans', isVariable: true, hasItalic: true, designer: 'Vernon Adams' },
  { family: 'Ubuntu', hasItalic: true, studio: 'Canonical' },
  { family: 'Playfair Display', isVariable: true, hasItalic: true, designer: 'Claus Eggers Sørensen' },
  { family: 'Rubik', isVariable: true, hasItalic: true, studio: 'Hubert & Fischer' },
  { family: 'PT Sans', hasItalic: true, studio: 'ParaType' },
  { family: 'Roboto Condensed', isVariable: true, hasItalic: true, studio: 'Google' },
  { family: 'Roboto Slab', isVariable: true, studio: 'Google' },
  { family: 'Noto Serif', isVariable: true, hasItalic: true, studio: 'Google' },
  { family: 'Mulish', isVariable: true, hasItalic: true, designer: 'Vernon Adams' },
  { family: 'Work Sans', isVariable: true, hasItalic: true, designer: 'Wei Huang' },
  { family: 'Fira Sans', hasItalic: true, studio: 'Mozilla' },
  { family: 'Quicksand', isVariable: true, designer: 'Andrew Paglinawan' },
  {
    family: 'Manrope',
    isVariable: true,
    designer: 'Mikhail Sharanda',
    summary: 'Manrope — современный геометрический гротеск для интерфейсов и брендинга.',
    description: [
      'Manrope — современный шрифт без засечек с чистой геометрической пластикой. Подходит для интерфейсов, лендингов и брендовых материалов.',
    ],
  },
  { family: 'DM Sans', isVariable: true, hasItalic: true, studio: 'Colophon Foundry' },
  { family: 'Bebas Neue', designer: 'Ryoichi Tsunekawa' },
  { family: 'Abril Fatface', studio: 'TypeTogether' },
  { family: 'Anton', designer: 'Vernon Adams' },
  { family: 'Libre Franklin', isVariable: true, hasItalic: true, studio: 'Impallari Type' },
  { family: 'Inconsolata', isVariable: true, designer: 'Raph Levien' },
  { family: 'Karla', isVariable: true, hasItalic: true, designer: 'Jonathan Pinhorn' },
  { family: 'Exo 2', isVariable: true, hasItalic: true, designer: 'Natanael Gama' },
  { family: 'Barlow', isVariable: true, hasItalic: true, designer: 'Jeremy Tribby' },
  { family: 'Cabin', isVariable: true, hasItalic: true, designer: 'Pablo Impallari' },
  { family: 'Josefin Sans', isVariable: true, hasItalic: true, designer: 'Santiago Orozco' },
  { family: 'Arimo', hasItalic: true, designer: 'Steve Matteson' },
  { family: 'Heebo', isVariable: true, designer: 'Oded Ezer' },
  { family: 'Titillium Web', hasItalic: true, studio: 'Accademia di Belle Arti di Urbino' },
  { family: 'Hind', designer: 'Indian Type Foundry' },
  { family: 'Assistant', isVariable: true, designer: 'Ben Nathan' },
  { family: 'IBM Plex Sans', isVariable: true, hasItalic: true, studio: 'IBM' },
  { family: 'IBM Plex Serif', hasItalic: true, studio: 'IBM' },
  { family: 'IBM Plex Mono', hasItalic: true, studio: 'IBM' },
  { family: 'Cormorant Garamond', isVariable: true, hasItalic: true, designer: 'Christian Thalmann' },
  { family: 'Lora', isVariable: true, hasItalic: true, studio: 'Cyreal' },
  { family: 'Bitter', isVariable: true, hasItalic: true, designer: 'Sol Matas' },
  { family: 'Crimson Text', hasItalic: true, designer: 'Sebastian Kosch' },
  { family: 'Libre Baskerville', designer: 'Impallari Type' },
  { family: 'Space Grotesk', isVariable: true, studio: 'Florian Karsten' },
  { family: 'Space Mono', hasItalic: true, studio: 'Colophon Foundry' },
  { family: 'Outfit', isVariable: true, studio: 'Outfit.io' },
  { family: 'Plus Jakarta Sans', isVariable: true, hasItalic: true, studio: 'Tokotype' },
  { family: 'Urbanist', isVariable: true, hasItalic: true, designer: 'Corey Hu' },
  { family: 'Jost', isVariable: true, hasItalic: true, designer: 'Owen Earl' },
  { family: 'Sora', isVariable: true, studio: 'Sora Sagano' },
  { family: 'Lexend', isVariable: true, studio: 'Bonnie Shaver-Troup' },
  { family: 'Kanit', hasItalic: true, studio: 'Cadson Demak' },
  { family: 'Tajawal', studio: 'Boutros Fonts' },
  { family: 'Cairo', isVariable: true, studio: 'Mohamed Gaber' },
  { family: 'Almarai', studio: 'Boutros Fonts' },
  { family: 'Chivo', isVariable: true, hasItalic: true, studio: 'Omnibus-Type' },
  { family: 'Archivo', isVariable: true, hasItalic: true, studio: 'Omnibus-Type' },
  { family: 'Archivo Narrow', hasItalic: true, studio: 'Omnibus-Type' },
  { family: 'Asap', isVariable: true, hasItalic: true, studio: 'Omnibus-Type' },
  { family: 'Maven Pro', isVariable: true, designer: 'Joe Prince' },
  { family: 'Oxygen', designer: 'Vernon Adams' },
  { family: 'Questrial', designer: 'Joe Prince' },
  { family: 'Varela Round', designer: 'Joe Prince' },
  { family: 'Yanone Kaffeesatz', isVariable: true, designer: 'Yanone' },
  { family: 'Zilla Slab', hasItalic: true, studio: 'Mozilla' },
  { family: 'Domine', isVariable: true, designer: 'Impallari Type' },
  { family: 'Vollkorn', isVariable: true, hasItalic: true, designer: 'Friedrich Althausen' },
  { family: 'Cardo', hasItalic: true, designer: 'David Perry' },
  { family: 'Spectral', hasItalic: true, studio: 'Production Type' },
  { family: 'Newsreader', isVariable: true, hasItalic: true, studio: 'Production Type' },
  { family: 'EB Garamond', isVariable: true, hasItalic: true, designer: 'Georg Duffner' },
  { family: 'Cormorant', isVariable: true, hasItalic: true, designer: 'Christian Thalmann' },
  { family: 'Prata', designer: 'Ivan Petrov' },
  { family: 'Cinzel', isVariable: true, designer: 'Natanael Gama' },
  { family: 'Bangers', designer: 'Vernon Adams' },
  { family: 'Pacifico', designer: 'Vernon Adams' },
  { family: 'Lobster', designer: 'Pablo Impallari' },
  { family: 'Dancing Script', isVariable: true, designer: 'Pablo Impallari' },
  { family: 'Caveat', isVariable: true, designer: 'Pablo Impallari' },
  { family: 'Permanent Marker', designer: 'Font Diner' },
  { family: 'Indie Flower', designer: 'Kimberly Geswein' },
  { family: 'Amatic SC', hasItalic: false, designer: 'Vernon Adams' },
  { family: 'Shadows Into Light', designer: 'Kimberly Geswein' },
  { family: 'Great Vibes', designer: 'TypeSETit' },
  { family: 'Satisfy', designer: 'Sideshow' },
  { family: 'Sacramento', designer: 'Brian J. Bonislawsky' },
  { family: 'Comfortaa', isVariable: true, designer: 'Johan Aakerlund' },
  { family: 'Righteous', designer: 'Astigmatic' },
  { family: 'Fredoka', isVariable: true, designer: 'Milena Brandao' },
  { family: 'Baloo 2', isVariable: true, studio: 'Ek Type' },
  { family: 'Noto Sans Display', isVariable: true, hasItalic: true, studio: 'Google' },
  { family: 'Noto Sans Mono', isVariable: true, studio: 'Google' },
  { family: 'Noto Sans JP', isVariable: true, studio: 'Google' },
  { family: 'Noto Sans KR', isVariable: true, studio: 'Google' },
];

function buildPopularGoogleFontPage(seed: FontSeoSeed): FontSeoPage {
  if (seed.family === 'Roboto') return ROBOTO_PAGE;

  const family = seed.family;
  const licenseInfo = commonOflInfo(family, seed.designer, seed.studio);
  const isVariable = seed.isVariable === true;
  const hasItalic = seed.hasItalic === true;
  const summary =
    seed.summary ||
    buildFontSeoSummary(family, 'Google Fonts');
  const description =
    seed.description ||
    buildFontSeoDescriptionBlocks(family);

  return {
    slug: slugifyFontKey(family),
    family,
    source: 'google',
    openQuery: googleQuery(family, isVariable),
    title: `${family} шрифт`,
    seoTitle: buildFontSeoTitle(family),
    seoDescription: buildFontSeoDescription(family),
    summary,
    description,
    isVariable,
    hasItalic,
    languageCount: seed.languageCount,
    ...licenseInfo,
  };
}

export const FONT_SEO_PAGES: FontSeoPage[] = POPULAR_GOOGLE_FONT_SEEDS.map(buildPopularGoogleFontPage);

export function getFontSeoPages(): FontSeoPage[] {
  return FONT_SEO_PAGES;
}

export function buildGeneratedGoogleFontSeoPageFromCatalog(row: Record<string, unknown>): FontSeoPage | null {
  const family = String(row?.family || '').trim();
  if (!family) return null;
  const isVariable = row.isVariable === true;
  const hasItalic = row.hasItalic === true || row.hasItalicStyles === true;
  const languageCount = Array.isArray(row.subsets) ? row.subsets.filter(Boolean).length : undefined;
  const styleCount = Number(row.styleCount);
  const category = String(row.category || '').trim();
  const licenseInfo = commonOflInfo(family);

  return {
    slug: slugifyFontKey(family),
    family,
    source: 'google',
    openQuery: googleQuery(family, isVariable),
    title: `${family} шрифт`,
    seoTitle: buildFontSeoTitle(family),
    seoDescription: buildFontSeoDescription(family),
    summary: buildFontSeoSummary(family, 'Google Fonts'),
    description: buildFontSeoDescriptionBlocks(family),
    isVariable,
    hasItalic,
    languageCount,
    styleCount: Number.isFinite(styleCount) && styleCount > 0 ? styleCount : undefined,
    ...licenseInfo,
    additionalInfo: [
      { label: 'Font family', value: family },
      { label: 'Source', value: 'Google Fonts' },
      { label: 'Category', value: category },
      { label: 'Variable', value: isVariable ? 'Yes' : 'No' },
      { label: 'Italic', value: hasItalic ? 'Yes' : 'No' },
      { label: 'License', value: licenseInfo.licenseName },
    ].filter((item) => item.value),
  };
}

export function buildGeneratedFontsourceSeoPageFromCatalog(row: Record<string, unknown>): FontSeoPage | null {
  const slug = String(row?.id || row?.slug || '').trim();
  const family = String(row?.family || row?.label || slug).trim();
  if (!slug || !family) return null;

  const isVariable = row.isVariable === true || row.variable === true;
  const hasItalic = row.hasItalic === true || (Array.isArray(row.styles) && row.styles.includes('italic'));
  const languageCount = Array.isArray(row.subsets) ? row.subsets.filter(Boolean).length : undefined;
  const styleCount = Number(row.styleCount);
  const category = String(row.category || '').trim();
  const licenseId = String(row.license || 'unknown').trim();
  const licenseInfo = commonFontsourceLicenseInfo(family, licenseId);

  return {
    slug,
    family,
    source: 'fontsource',
    openQuery: fontsourceQuery(slug, isVariable),
    title: `${family} шрифт`,
    seoTitle: buildFontSeoTitle(family),
    seoDescription: buildFontSeoDescription(family),
    summary: buildFontSeoSummary(family, 'Fontsource'),
    description: buildFontSeoDescriptionBlocks(family, false),
    isVariable,
    hasItalic,
    languageCount,
    styleCount: Number.isFinite(styleCount) && styleCount > 0 ? styleCount : undefined,
    ...licenseInfo,
    additionalInfo: [
      { label: 'Font family', value: family },
      { label: 'Source', value: 'Fontsource' },
      { label: 'Package slug', value: slug },
      { label: 'Category', value: category },
      { label: 'Variable', value: isVariable ? 'Yes' : 'No' },
      { label: 'Italic', value: hasItalic ? 'Yes' : 'No' },
      { label: 'License', value: licenseInfo.licenseName },
    ].filter((item) => item.value),
  };
}

export function findFontSeoPage(slug: string): FontSeoPage | null {
  const normalized = slugifyFontKey(slug);
  return FONT_SEO_PAGES.find((page) => page.slug === normalized) || null;
}

export function findFontSeoPageForFont(font: SessionFontRecord | null | undefined): FontSeoPage | null {
  if (!font) return null;
  const candidates = [
    font.displayName,
    font.name,
    font.originalName,
    font.fontFamily,
    typeof font.id === 'string' && font.id.includes(':') ? font.id.split(':').pop() : font.id,
  ];
  for (const candidate of candidates) {
    const slug = slugifyFontKey(String(candidate || '').replace(/\.(ttf|otf|woff2?|zip)$/i, ''));
    const hit = findFontSeoPage(slug);
    if (hit) return hit;
  }
  return null;
}

export function buildFontSeoEditorUrl(page: FontSeoPage): string {
  const params = new URLSearchParams(page.openQuery);
  return `/?${params.toString()}`;
}
