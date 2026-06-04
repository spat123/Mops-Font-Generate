import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { LibraryAuthProvider } from '../../contexts/LibraryAuthContext';
import { PlansDialog } from '../../components/ui/PlansDialog';
import { EditorHomeLayout } from '../../components/editor/EditorHomeLayout';
import { OpenGraphHead } from '../../components/seo/OpenGraphHead';
import { type FontSeoPage } from '../../data/fontSeoPages';
import { findFontSeoPageServer } from '../../utils/fontSeoPagesServer';
import { useEditorHomePage } from '../../hooks/useEditorHomePage';
import { getDefaultOgImageUrl, getSiteOrigin, type SiteSeoMeta } from '../../utils/siteSeo';

type FontSeoPageProps = {
  page: FontSeoPage;
  seo: SiteSeoMeta;
};

export const getServerSideProps: GetServerSideProps<FontSeoPageProps> = async ({ req, params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const page = await findFontSeoPageServer(slug);
  if (!page) return { notFound: true };

  const origin = getSiteOrigin(req);
  const canonicalUrl = `${origin}/fonts/${page.slug}`;
  const serializablePage = JSON.parse(JSON.stringify(page)) as FontSeoPage;

  return {
    props: {
      page: serializablePage,
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

export default function FontSeoPageRoute({ page, seo }: FontSeoPageProps) {
  const router = useRouter();
  const { libraryAuthValue, isPlansOpen, setIsPlansOpen, layout } = useEditorHomePage(router, {
    initialOpenQuery: page.openQuery,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: page.family,
    description: page.seoDescription,
    url: seo.canonicalUrl,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
    },
    isAccessibleForFree: true,
  };

  return (
    <>
      <OpenGraphHead {...seo} />
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>
      <LibraryAuthProvider value={libraryAuthValue}>
        <PlansDialog
          open={isPlansOpen}
          onClose={() => setIsPlansOpen(false)}
          currentPlan={libraryAuthValue.planName || (libraryAuthValue.isPro ? 'Pro' : 'Free')}
        />
        <EditorHomeLayout {...layout} />
      </LibraryAuthProvider>
    </>
  );
}
