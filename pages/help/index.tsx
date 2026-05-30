import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { HelpPageLayout } from '../../components/help/HelpPageLayout';
import { HelpLicensesTab } from '../../components/help/HelpLicensesTab';
import { HelpNewsFeed } from '../../components/help/HelpNewsFeed';
import { HelpOverview } from '../../components/help/HelpOverview';
import { HelpGuidesSection } from '../../components/help/HelpGuidesSection';
import {
  knowledgeBaseTabMeta,
  parseKnowledgeBaseTab,
  type KnowledgeBaseTab,
} from '../../components/help/knowledgeBaseNav';
import { getEditorFeedByKind } from '../../data/editorNewsFeed';
import { buildHelpPageSeo } from '../../utils/helpSeo';
import { getSiteOrigin, type SiteSeoMeta } from '../../utils/siteSeo';

type HelpPageProps = {
  seo: SiteSeoMeta;
  initialTab: KnowledgeBaseTab;
};

export const getServerSideProps: GetServerSideProps<HelpPageProps> = async ({ req, query }) => {
  const initialTab = parseKnowledgeBaseTab(query.tab);
  const origin = getSiteOrigin(req);
  return {
    props: {
      seo: buildHelpPageSeo(initialTab, origin),
      initialTab,
    },
  };
};

export default function HelpPage({ initialTab }: HelpPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<KnowledgeBaseTab>(initialTab);

  useEffect(() => {
    if (!router.isReady) return;
    setActiveTab(parseKnowledgeBaseTab(router.query.tab));
  }, [router.isReady, router.query.tab]);

  const seo = useMemo(() => buildHelpPageSeo(activeTab), [activeTab]);
  const sectionMeta = useMemo(() => knowledgeBaseTabMeta(activeTab), [activeTab]);

  const newsFeed = useMemo(() => getEditorFeedByKind('news'), []);
  const updatesFeed = useMemo(() => getEditorFeedByKind('updates'), []);

  const onTabChange = useCallback(
    (next: KnowledgeBaseTab) => {
      setActiveTab(next);
      void router.replace({ pathname: '/help', query: { tab: next } }, undefined, { shallow: true });
    },
    [router],
  );

  const sectionBody = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <HelpOverview onNavigate={onTabChange} />;
      case 'guides':
        return <HelpGuidesSection />;
      case 'licenses':
        return <HelpLicensesTab />;
      case 'news':
        return <HelpNewsFeed items={newsFeed} emptyLabel="Пока нет новостей" />;
      case 'updates':
        return <HelpNewsFeed items={updatesFeed} emptyLabel="Пока нет записей об обновлениях" />;
      default:
        return null;
    }
  }, [activeTab, newsFeed, onTabChange, updatesFeed]);

  const hideSectionHeader = activeTab === 'overview';

  return (
    <HelpPageLayout
      seo={seo}
      activeTab={activeTab}
      onTabChange={onTabChange}
      sectionTitle={hideSectionHeader ? undefined : sectionMeta.label}
      sectionDescription={hideSectionHeader ? undefined : sectionMeta.description}
    >
      {sectionBody}
    </HelpPageLayout>
  );
}
