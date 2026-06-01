import type { GetServerSideProps } from 'next';
import { getSiteOrigin } from '../utils/siteSeo';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const origin = getSiteOrigin(req);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /auth/',
    'Disallow: /share?',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.write(body);
  res.end();

  return { props: {} };
};

export default function RobotsTxt() {
  return null;
}
