import { knowledgeBaseTabMeta, type KnowledgeBaseTab } from '../components/help/knowledgeBaseNav';
import { legalMeta } from '../config/legal';
import { getDefaultOgImageUrl, getSiteOrigin, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, type SiteSeoMeta } from './siteSeo';

const SITE_NAME = legalMeta.serviceName;

const HELP_TAB_DESCRIPTIONS: Record<KnowledgeBaseTab, string> = {
  overview:
    'База знаний DINAMIC FONT: руководства по каталогу и редактору, справочник лицензий шрифтов (OFL, MIT, GPL, Creative Commons), новости и история обновлений.',
  guides:
    'Руководства DINAMIC FONT: каталог Google Fonts и Fontsource, библиотеки шрифтов, редактор и превью, вариативные шрифты, загрузка локальных файлов.',
  licenses:
    'Справочник лицензий шрифтов для каталога DINAMIC FONT: SIL OFL, Apache 2.0, MIT, Creative Commons и другие — коммерческое использование, NC и copyleft.',
  news: 'Новости и анонсы DINAMIC FONT: обновления сервиса, каталогов и редактора шрифтов.',
  updates: 'История обновлений редактора DINAMIC FONT: новые функции, исправления и изменения интерфейса.',
};

export function getHelpCanonicalUrl(tab: KnowledgeBaseTab, origin?: string): string {
  const base = `${String(origin || getSiteOrigin()).replace(/\/$/, '')}/help`;
  return tab === 'overview' ? base : `${base}?tab=${tab}`;
}

export function buildHelpPageTitle(tab: KnowledgeBaseTab): string {
  if (tab === 'overview') return `База знаний — ${SITE_NAME}`;
  const { label } = knowledgeBaseTabMeta(tab);
  return `${label} — База знаний — ${SITE_NAME}`;
}

export function buildHelpPageSeo(tab: KnowledgeBaseTab, origin?: string): SiteSeoMeta {
  const siteOrigin = String(origin || getSiteOrigin()).replace(/\/$/, '');
  return {
    title: buildHelpPageTitle(tab),
    description: HELP_TAB_DESCRIPTIONS[tab],
    canonicalUrl: getHelpCanonicalUrl(tab, siteOrigin),
    imageUrl: getDefaultOgImageUrl(siteOrigin),
    imageWidth: OG_IMAGE_WIDTH,
    imageHeight: OG_IMAGE_HEIGHT,
    imageType: 'image/png',
    imageAlt: `${SITE_NAME} — база знаний`,
    siteName: SITE_NAME,
    type: 'website',
  };
}

export type HelpBreadcrumbItem = { name: string; item: string };

export function buildHelpBreadcrumbs(tab: KnowledgeBaseTab, origin?: string): HelpBreadcrumbItem[] {
  const base = String(origin || getSiteOrigin()).replace(/\/$/, '');
  const items: HelpBreadcrumbItem[] = [
    { name: 'Главная', item: `${base}/` },
    { name: 'База знаний', item: `${base}/help` },
  ];
  if (tab !== 'overview') {
    const { label } = knowledgeBaseTabMeta(tab);
    items.push({ name: label, item: getHelpCanonicalUrl(tab, base) });
  }
  return items;
}

export function buildHelpPageJsonLd(tab: KnowledgeBaseTab, seo: SiteSeoMeta) {
  const breadcrumbs = buildHelpBreadcrumbs(tab);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${seo.canonicalUrl}#webpage`,
        url: seo.canonicalUrl,
        name: buildHelpPageTitle(tab),
        description: seo.description,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: String(originOrSite(seo.canonicalUrl)),
        },
        inLanguage: 'ru-RU',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.item,
        })),
      },
    ],
  };
}

function originOrSite(canonicalUrl: string): string {
  try {
    const url = new URL(canonicalUrl);
    return url.origin;
  } catch {
    return legalMeta.siteUrl;
  }
}
