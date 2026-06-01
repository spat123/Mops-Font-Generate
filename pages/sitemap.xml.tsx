import type { GetServerSideProps } from 'next';
import { getSiteOrigin } from '../utils/siteSeo';

type SitemapEntry = {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
};

const SITEMAP_ENTRIES: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/help', changefreq: 'weekly', priority: '0.8' },
  { path: '/help?tab=guides', changefreq: 'monthly', priority: '0.7' },
  { path: '/help?tab=licenses', changefreq: 'monthly', priority: '0.7' },
  { path: '/help?tab=news', changefreq: 'weekly', priority: '0.6' },
  { path: '/help?tab=updates', changefreq: 'weekly', priority: '0.6' },
  { path: '/legal/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/legal/privacy', changefreq: 'yearly', priority: '0.3' },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const origin = getSiteOrigin(req);
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_ENTRIES.map(({ path, changefreq, priority }) => {
    const loc = `${origin}${path}`;
    return [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n');
  }).join('\n');
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.write(body);
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}
