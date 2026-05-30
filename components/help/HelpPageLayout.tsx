import type { ReactNode } from 'react';
import Link from 'next/link';
import { AuthLogoLink } from '../auth/AuthSplitLayout';
import { legalMeta } from '../../config/legal';
import type { SiteSeoMeta } from '../../utils/siteSeo';
import { HelpArrowRightIcon } from './HelpIcons';
import { HelpSeoHead } from './HelpSeoHead';
import { HelpSidebar } from './HelpSidebar';
import type { KnowledgeBaseTab } from './knowledgeBaseNav';

export function HelpPageLayout({
  seo,
  activeTab,
  onTabChange,
  sectionTitle,
  sectionDescription,
  children,
}: {
  seo: SiteSeoMeta;
  activeTab: KnowledgeBaseTab;
  onTabChange: (tab: KnowledgeBaseTab) => void;
  sectionTitle?: string;
  sectionDescription?: string;
  children: ReactNode;
}) {
  const sectionLabel = sectionTitle || 'Обзор базы знаний';

  return (
    <>
      <HelpSeoHead tab={activeTab} seo={seo} />
      <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <AuthLogoLink align="start" />
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-tight text-gray-900 transition-colors hover:border-black/[0.9] hover:bg-black/[0.9] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              В редактор
              <HelpArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 flex min-w-0 flex-col gap-2 lg:mb-8 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <h1 className="shrink-0 text-2xl font-semibold uppercase tracking-tight text-gray-900 sm:text-3xl">
              База знаний
            </h1>
            <p className="min-w-0 text-sm leading-relaxed text-gray-600 sm:max-w-[55%] sm:text-right">
              Руководства, лицензии шрифтов и новости {legalMeta.serviceName}.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:gap-10">
            <aside className="min-w-0 lg:w-60 lg:shrink-0">
              <div className="lg:sticky lg:top-6">
                <HelpSidebar activeTab={activeTab} onTabChange={onTabChange} />
              </div>
            </aside>

            <main className="min-w-0 flex-1 basis-0 overflow-x-clip" id="help-main">
              <section
                aria-label={sectionLabel}
                className="w-full min-w-0 overflow-x-clip rounded-lg border border-gray-200 bg-white p-5 shadow-none sm:p-7"
              >
                {sectionTitle ? (
                  <header className="mb-6 flex min-w-0 flex-col gap-2 border-b border-gray-100 pb-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <h2
                      id="help-section-title"
                      className="shrink-0 text-lg font-semibold uppercase tracking-tight text-gray-900 sm:text-xl"
                    >
                      {sectionTitle}
                    </h2>
                    {sectionDescription ? (
                      <p className="min-w-0 text-sm leading-relaxed text-gray-600 sm:max-w-[55%] sm:text-right">
                        {sectionDescription}
                      </p>
                    ) : null}
                  </header>
                ) : null}
                {children}
              </section>

              <footer className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                <span>© {new Date().getFullYear()} {legalMeta.serviceName}</span>
                <span aria-hidden>·</span>
                <Link href="/legal/terms" className="hover:text-gray-800">
                  Условия
                </Link>
                <span aria-hidden>·</span>
                <Link href="/legal/privacy" className="hover:text-gray-800">
                  Конфиденциальность
                </Link>
              </footer>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
