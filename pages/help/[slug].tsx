import { useMemo } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { HelpArticleBody } from '../../components/help/HelpArticleBody';
import { HelpPageLayout } from '../../components/help/HelpPageLayout';
import type { KnowledgeBaseTab } from '../../components/help/knowledgeBaseNav';
import {
  findKnowledgeBaseArticle,
  type KnowledgeBaseArticle,
} from '../../data/knowledgeBaseArticles';
import {
  buildHelpArticleJsonLd,
  buildHelpArticleSeo,
} from '../../utils/helpSeo';
import { getSiteOrigin, type SiteSeoMeta } from '../../utils/siteSeo';

type HelpArticlePageProps = {
  article: KnowledgeBaseArticle;
  seo: SiteSeoMeta;
};

export const getServerSideProps: GetServerSideProps<HelpArticlePageProps> = async ({ req, params }) => {
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const article = findKnowledgeBaseArticle(slug);
  if (!article) return { notFound: true };
  const origin = getSiteOrigin(req);
  return {
    props: {
      article,
      seo: buildHelpArticleSeo(article, origin),
    },
  };
};

export default function HelpArticlePage({ article, seo }: HelpArticlePageProps) {
  const router = useRouter();
  const resolvedSeo = useMemo(() => seo || buildHelpArticleSeo(article), [article, seo]);
  const jsonLd = useMemo(() => buildHelpArticleJsonLd(article, resolvedSeo), [article, resolvedSeo]);

  const onTabChange = (tab: KnowledgeBaseTab) => {
    void router.push(tab === 'overview' ? '/help' : `/help?tab=${tab}`);
  };

  return (
    <HelpPageLayout
      seo={resolvedSeo}
      jsonLd={jsonLd}
      activeTab="guides"
      onTabChange={onTabChange}
      sectionTitle="Руководство"
      sectionDescription="Практическая статья для проверки, сравнения и экспорта шрифтов."
    >
      <HelpArticleBody article={article} />
    </HelpPageLayout>
  );
}
