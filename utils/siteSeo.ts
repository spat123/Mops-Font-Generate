import type { IncomingMessage } from 'http';
import { decodeLibrarySharePayloadFromQueryParam } from './libraryShareLinkServer';
import { buildShareOgImageUrl, SHARE_OG_HEIGHT, SHARE_OG_WIDTH } from './libraryShareOg';
import type { LibrarySharePayload } from './libraryShareLink';

const SITE_NAME = 'DINAMIC FONT';
const DEFAULT_OG_IMAGE_PATH = '/og.png';
export const OG_IMAGE_WIDTH = 525;
export const OG_IMAGE_HEIGHT = 225;
export const DEFAULT_TITLE = 'DINAMIC FONT — проверка, создание и анимация шрифтов';
export const DEFAULT_DESCRIPTION =
  'Онлайн-редактор шрифтов: сравнивайте начертания, собирайте библиотеки, загружайте свои файлы и экспортируйте результат.';

export type SiteSeoMeta = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageType?: string;
  imageAlt?: string;
  siteName?: string;
  type?: string;
};

export function getSiteOrigin(req?: IncomingMessage): string {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (req?.headers?.host) {
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    return `${proto}://${req.headers.host}`;
  }
  return 'https://dynamicfont.ru';
}

export function getDefaultOgImageUrl(origin?: string): string {
  const base = String(origin || getSiteOrigin()).replace(/\/$/, '');
  return `${base}${DEFAULT_OG_IMAGE_PATH}`;
}

function withOgImageMeta(seo: SiteSeoMeta, origin: string): SiteSeoMeta {
  const imageUrl = seo.imageUrl || getDefaultOgImageUrl(origin);
  return {
    ...seo,
    imageUrl,
    imageWidth: OG_IMAGE_WIDTH,
    imageHeight: OG_IMAGE_HEIGHT,
    imageType: 'image/png',
  };
}

export function getDefaultSiteSeo(origin?: string): SiteSeoMeta {
  const siteUrl = String(origin || getSiteOrigin()).replace(/\/$/, '');
  return withOgImageMeta(
    {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: siteUrl,
      imageAlt: SITE_NAME,
      siteName: SITE_NAME,
      type: 'website',
    },
    siteUrl,
  );
}

function summarizeShareFonts(items: LibrarySharePayload['items'], limit = 4): string {
  const names: string[] = [];
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

export function buildSharePageSeo({
  origin,
  shortId,
  shareParam,
  payload: payloadIn,
}: {
  origin?: string;
  shortId?: string;
  shareParam?: string;
  payload?: LibrarySharePayload | null;
}): SiteSeoMeta {
  const siteOrigin = origin || getSiteOrigin();
  const id = String(shortId || '').trim();
  const legacy = String(shareParam || '').trim();
  const payload =
    payloadIn !== undefined
      ? payloadIn
      : legacy
        ? decodeLibrarySharePayloadFromQueryParam(legacy)
        : null;

  const canonicalUrl = id
    ? `${siteOrigin}/share?id=${encodeURIComponent(id)}`
    : legacy
      ? `${siteOrigin}/share?share=${encodeURIComponent(legacy)}`
      : `${siteOrigin}/share`;

  if (!payload) {
    return withOgImageMeta(
      {
        title: `Поделиться шрифтами — ${SITE_NAME}`,
        description: 'Ссылка на подборку шрифтов в DINAMIC FONT.',
        canonicalUrl,
        imageAlt: SITE_NAME,
        siteName: SITE_NAME,
        type: 'website',
      },
      siteOrigin,
    );
  }

  const libraryName = String(payload?.library?.name || '').trim() || 'Подборка шрифтов';
  const count = Array.isArray(payload.items) ? payload.items.length : 0;
  const sample = summarizeShareFonts(payload.items);
  const description = sample
    ? `${count} шрифт${count === 1 ? '' : count < 5 ? 'а' : 'ов'}: ${sample}. Скачать или открыть в редакторе.`
    : `${count} шрифт${count === 1 ? '' : count < 5 ? 'а' : 'ов'} в подборке. Скачать или открыть в редакторе.`;

  const imageUrl = buildShareOgImageUrl(siteOrigin, { shortId: id, shareParam: legacy });

  return {
    title: `${libraryName} — ${SITE_NAME}`,
    description,
    canonicalUrl,
    imageUrl,
    imageWidth: SHARE_OG_WIDTH,
    imageHeight: SHARE_OG_HEIGHT,
    imageType: 'image/png',
    imageAlt: libraryName,
    siteName: SITE_NAME,
    type: 'website',
  };
}
