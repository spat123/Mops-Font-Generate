import Head from 'next/head';
import { OpenGraphHead } from '../seo/OpenGraphHead';
import { buildHelpPageJsonLd } from '../../utils/helpSeo';
import type { KnowledgeBaseTab } from './knowledgeBaseNav';
import type { SiteSeoMeta } from '../../utils/siteSeo';

/** SEO: title, description, OG/Twitter, canonical и JSON-LD для /help. */
export function HelpSeoHead({
  tab,
  seo,
  jsonLd,
}: {
  tab: KnowledgeBaseTab;
  seo: SiteSeoMeta;
  jsonLd?: Record<string, unknown>;
}) {
  const resolvedJsonLd = jsonLd || buildHelpPageJsonLd(tab, seo);

  return (
    <>
      <OpenGraphHead
        title={seo.title}
        description={seo.description}
        canonicalUrl={seo.canonicalUrl}
        imageUrl={seo.imageUrl}
        imageWidth={seo.imageWidth}
        imageHeight={seo.imageHeight}
        imageType={seo.imageType}
        imageAlt={seo.imageAlt}
        siteName={seo.siteName}
        type={seo.type}
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(resolvedJsonLd) }}
        />
      </Head>
    </>
  );
}
