import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { FontInfoContent } from '../../components/fontInfo/FontInfoDialog';
import { OpenGraphHead } from '../../components/seo/OpenGraphHead';
import {
  buildFontSeoEditorUrl,
  type FontSeoPage,
} from '../../data/fontSeoPages';
import { findFontSeoPageServer } from '../../utils/fontSeoPagesServer';
import { getDefaultOgImageUrl, getSiteOrigin, type SiteSeoMeta } from '../../utils/siteSeo';

type FontSeoPageProps = {
  page: FontSeoPage;
  seo: SiteSeoMeta;
  editorUrl: string;
};

export const getServerSideProps: GetServerSideProps<FontSeoPageProps> = async ({ req, params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const page = await findFontSeoPageServer(slug);
  if (!page) return { notFound: true };

  const origin = getSiteOrigin(req);
  const canonicalUrl = `${origin}/fonts/${page.slug}`;
  const editorUrl = buildFontSeoEditorUrl(page);
  const serializablePage = JSON.parse(JSON.stringify(page)) as FontSeoPage;

  return {
    props: {
      page: serializablePage,
      editorUrl,
      seo: {
        title: page.seoTitle,
        description: page.seoDescription,
        canonicalUrl,
        imageUrl: getDefaultOgImageUrl(origin),
        imageAlt: `${page.family} — DINAMIC FONT`,
        siteName: 'DINAMIC FONT',
        type: 'article',
      },
    },
  };
};

export default function FontSeoPageRoute({ page, seo, editorUrl }: FontSeoPageProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: page.family,
    description: page.seoDescription,
    url: seo.canonicalUrl,
    license: page.licenseName,
    creator: page.designers?.length ? page.designers.join(', ') : page.studio || 'DINAMIC FONT',
    isAccessibleForFree: true,
  };

  return (
    <>
      <OpenGraphHead {...seo} />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8 sm:py-12">
          <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">DINAMIC FONT</p>
            <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-gray-900 sm:text-5xl">
              {page.family}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">
              {page.seoDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={editorUrl}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:border-accent-hover hover:bg-accent-hover"
              >
                Открыть в редакторе
              </Link>
              <Link
                href="/help?tab=licenses"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-xs font-semibold uppercase tracking-wide text-gray-900 transition-colors hover:border-accent/40 hover:text-accent"
              >
                Лицензии шрифтов
              </Link>
            </div>
          </header>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <FontInfoContent page={page} />
          </section>
        </div>
      </main>
    </>
  );
}
