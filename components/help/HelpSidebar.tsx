import Link from 'next/link';
import {
  KNOWLEDGE_BASE_NAV,
  type KnowledgeBaseTab,
} from './knowledgeBaseNav';
import { HelpTabIcon } from './HelpIcons';

export function HelpSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: KnowledgeBaseTab;
  onTabChange: (tab: KnowledgeBaseTab) => void;
}) {
  return (
    <nav aria-label="Разделы базы знаний" className="space-y-1">
      <p className="mb-3 hidden px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 lg:block">
        Разделы
      </p>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {KNOWLEDGE_BASE_NAV.map((item) => {
          const active = item.id === activeTab;
          return (
            <li key={item.id} className="shrink-0 lg:shrink">
              <Link
                href={`/help?tab=${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onTabChange(item.id);
                }}
                aria-current={active ? 'page' : undefined}
                className={[
                  'group flex min-w-[7.5rem] items-center gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-300 lg:min-w-0 lg:w-full',
                  active
                    ? 'bg-gray-100 text-gray-900 ring-1 ring-inset ring-gray-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-colors',
                    active
                      ? 'bg-white text-gray-900 ring-gray-300'
                      : 'bg-gray-100 text-gray-600 ring-gray-200 group-hover:bg-white group-hover:text-gray-700 group-hover:ring-gray-300',
                  ].join(' ')}
                >
                  <HelpTabIcon tab={item.id} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-tight">{item.label}</span>
                  <span className="mt-0.5 hidden text-[11px] font-normal normal-case leading-snug text-gray-600 lg:block">
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
