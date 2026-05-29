import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { HelpPageLayout } from '../../components/help/HelpPageLayout';
import { HelpLicensesTab } from '../../components/help/HelpLicensesTab';
import { HelpNewsFeed } from '../../components/help/HelpNewsFeed';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { getEditorFeedByKind } from '../../data/editorNewsFeed';

const HELP_TABS = ['licenses', 'news', 'updates'] as const;
type HelpTab = (typeof HELP_TABS)[number];

function parseHelpTab(raw: unknown): HelpTab {
  const value = String(raw || '').trim();
  if (value === 'news' || value === 'updates' || value === 'licenses') return value;
  return 'licenses';
}

export default function HelpPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HelpTab>('licenses');

  useEffect(() => {
    if (!router.isReady) return;
    setActiveTab(parseHelpTab(router.query.tab));
  }, [router.isReady, router.query.tab]);

  const tabOptions = useMemo(
    () => [
      { value: 'licenses', label: 'Лицензии', title: 'Справочник лицензий шрифтов' },
      { value: 'news', label: 'Новости', title: 'Новости DINAMIC FONT' },
      { value: 'updates', label: 'Обновления', title: 'Обновления редактора' },
    ],
    [],
  );

  const newsFeed = useMemo(() => getEditorFeedByKind('news'), []);
  const updatesFeed = useMemo(() => getEditorFeedByKind('updates'), []);

  const onTabChange = useCallback(
    (next: string) => {
      const tab = parseHelpTab(next);
      setActiveTab(tab);
      void router.replace({ pathname: '/help', query: { tab } }, undefined, { shallow: true });
    },
    [router],
  );

  return (
    <HelpPageLayout
      title="База знаний"
      description="Лицензии шрифтов, новости и обновления DINAMIC FONT."
    >
      <header className="border-b border-gray-100 pb-4">
        <h1 className="text-lg font-semibold uppercase tracking-tight text-gray-900">База знаний</h1>
        <p className="mt-2 text-sm text-gray-500">
          Справочник по лицензиям и лента новостей продукта.
        </p>
      </header>

      <div className="mt-5">
        <SegmentedControl
          variant="joined"
          value={activeTab}
          onChange={onTabChange}
          options={tabOptions}
          className="w-full max-w-md"
        />
      </div>

      <div className="mt-6">
        {activeTab === 'licenses' ? <HelpLicensesTab /> : null}
        {activeTab === 'news' ? (
          <HelpNewsFeed items={newsFeed} emptyLabel="Пока нет новостей" />
        ) : null}
        {activeTab === 'updates' ? (
          <HelpNewsFeed items={updatesFeed} emptyLabel="Пока нет записей об обновлениях" />
        ) : null}
      </div>
    </HelpPageLayout>
  );
}
