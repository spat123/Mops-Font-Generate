import Link from 'next/link';
import type { KnowledgeBaseArticle } from '../../data/knowledgeBaseArticles';
import { HelpArrowRightIcon } from './HelpIcons';

export function HelpArticleBody({ article }: { article: KnowledgeBaseArticle }) {
  return (
    <article className="min-w-0">
      <div className="border-b border-gray-100 pb-6">
        <Link
          href="/help?tab=guides"
          className="inline-flex text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:text-gray-900"
        >
          ← Все руководства
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          Руководство · {article.readingTime}
        </p>
        <h1 className="mt-3 text-2xl font-semibold uppercase tracking-tight text-gray-900 sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600">
          {article.lead}
        </p>
      </div>

      <div className="mt-7 space-y-8">
        {article.sections.map((section) => (
          <section key={section.title} className="scroll-mt-24">
            <h2 className="text-lg font-semibold uppercase tracking-tight text-gray-900">
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 text-sm leading-7 text-gray-700 sm:text-base">
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700 sm:text-base">
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 56)}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-9 rounded-lg border border-gray-200 bg-gray-50 px-5 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-tight text-gray-900">
          Попробуйте в DINAMIC FONT
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Откройте редактор, загрузите свои файлы или выберите шрифт из каталога, чтобы проверить его на реальном тексте.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-xs font-semibold uppercase tracking-tight text-white transition-colors hover:bg-accent"
        >
          {article.ctaLabel || 'Открыть редактор'}
          <HelpArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
