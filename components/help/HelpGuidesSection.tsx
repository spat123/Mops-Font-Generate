import { useMemo, useState } from 'react';
import { KNOWLEDGE_BASE_GUIDES } from '../../data/knowledgeBaseGuides';
import { HelpChevronDownIcon } from './HelpIcons';

export function HelpGuidesSection() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(KNOWLEDGE_BASE_GUIDES[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return KNOWLEDGE_BASE_GUIDES;
    return KNOWLEDGE_BASE_GUIDES.filter((guide) => {
      const haystack = [
        guide.title,
        guide.lead,
        ...guide.sections.flatMap((s) => [s.title, ...(s.paragraphs || []), ...(s.bullets || [])]),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="sr-only">Поиск по руководствам</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по руководствам…"
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
          Ничего не найдено. Попробуйте другой запрос.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((guide) => {
            const expanded = openId === guide.id;
            return (
              <article
                key={guide.id}
                id={`guide-${guide.id}`}
                className="scroll-mt-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-50/60 transition-colors hover:border-gray-300 hover:bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? null : guide.id)}
                  aria-expanded={expanded}
                  className="group flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-4 text-left transition-colors outline-none hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-gray-300"
                >
                  <span className="min-w-0">
                    <h3 className="text-sm font-semibold tracking-tight text-gray-900">{guide.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{guide.lead}</p>
                  </span>
                  <span
                    className={[
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-transform group-hover:text-gray-700',
                      expanded ? 'rotate-180' : '',
                    ].join(' ')}
                    aria-hidden
                  >
                    <HelpChevronDownIcon className="h-4 w-4" />
                  </span>
                </button>
                {expanded ? (
                  <div className="space-y-5 border-t border-gray-200/70 px-4 pb-5 pt-4">
                    {guide.sections.map((section) => (
                      <section key={section.title}>
                        <h4 className="text-xs font-semibold tracking-wide text-gray-900">{section.title}</h4>
                        {section.paragraphs?.map((p) => (
                          <p key={p.slice(0, 40)} className="mt-2 text-sm leading-relaxed text-gray-700">
                            {p}
                          </p>
                        ))}
                        {section.bullets?.length ? (
                          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
                            {section.bullets.map((b) => (
                              <li key={b.slice(0, 48)}>{b}</li>
                            ))}
                          </ul>
                        ) : null}
                      </section>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
