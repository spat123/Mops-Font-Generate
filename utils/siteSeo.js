import { decodeLibrarySharePayloadFromQueryParam } from './libraryShareLinkServer';
import { editorNewsAssetUrl } from '../data/editorNewsFeed';

const SITE_NAME = 'DINAMIC FONT';
const DEFAULT_OG_IMAGE_PATH = editorNewsAssetUrl('RU', 'Dinamic post.png');
const DEFAULT_TITLE = 'DINAMIC FONT — тестирование и сравнение шрифтов';
const DEFAULT_DESCRIPTION =
  'Тестирование, сравнение и работа со шрифтами: библиотеки, каталоги Google Fonts и Fontsource, экспорт.';

/** @param {import('http').IncomingMessage} [req] */
export function getSiteOrigin(req) {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (req?.headers?.host) {
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    return `${proto}://${req.headers.host}`;
  }
  return 'https://dynamicfont.ru';
}

export function getDefaultOgImageUrl(origin) {
  const base = String(origin || getSiteOrigin()).replace(/\/$/, '');
  return `${base}${DEFAULT_OG_IMAGE_PATH}`;
}

export function getDefaultSiteSeo(origin) {
  const siteUrl = String(origin || getSiteOrigin()).replace(/\/$/, '');
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: siteUrl,
    imageUrl: getDefaultOgImageUrl(siteUrl),
    imageAlt: SITE_NAME,
    siteName: SITE_NAME,
    type: 'website',
  };
}

function summarizeShareFonts(items, limit = 4) {
  const names = [];
  for (const it of items) {
    const label = String(it?.family || it?.key || '').trim();
    if (label && !names.includes(label)) names.push(label);
    if (names.length >= limit) break;
  }
  if (names.length === 0) return '';
  const rest = items.length - names.length;
  const list = names.join(', ');
  if (rest > 0) return `${list} и ещё ${rest}`;
  return list;
}

/**
 * SEO для `/share?share=...` (SSR — превью в Telegram, WhatsApp, VK и т.д.).
 * @param {{ origin?: string, shareParam?: string, payload?: object | null }} input
 */
export function buildSharePageSeo({ origin, shareParam, payload: payloadIn }) {
  const siteOrigin = origin || getSiteOrigin();
  const payload =
    payloadIn !== undefined
      ? payloadIn
      : shareParam
        ? decodeLibrarySharePayloadFromQueryParam(shareParam)
        : null;

  const canonicalUrl = shareParam
    ? `${siteOrigin}/share?share=${encodeURIComponent(String(shareParam))}`
    : `${siteOrigin}/share`;

  if (!payload) {
    return {
      title: `Поделиться шрифтами — ${SITE_NAME}`,
      description: 'Ссылка на подборку шрифтов в DINAMIC FONT.',
      canonicalUrl,
      imageUrl: getDefaultOgImageUrl(siteOrigin),
      imageAlt: SITE_NAME,
      siteName: SITE_NAME,
      type: 'website',
      noIndex: true,
    };
  }

  const libraryName = String(payload?.library?.name || '').trim() || 'Подборка шрифтов';
  const count = Array.isArray(payload.items) ? payload.items.length : 0;
  const sample = summarizeShareFonts(payload.items);
  const description = sample
    ? `${count} шрифт${count === 1 ? '' : count < 5 ? 'а' : 'ов'}: ${sample}. Скачать или открыть в редакторе.`
    : `${count} шрифт${count === 1 ? '' : count < 5 ? 'а' : 'ов'} в подборке. Скачать или открыть в редакторе.`;

  return {
    title: `${libraryName} — ${SITE_NAME}`,
    description,
    canonicalUrl,
    imageUrl: getDefaultOgImageUrl(siteOrigin),
    imageAlt: libraryName,
    siteName: SITE_NAME,
    type: 'website',
  };
}
