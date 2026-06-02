import Link from 'next/link';
import { Tooltip } from '../ui/Tooltip';

/** Как `AppButton` variant="outline": белая, чёрная заливка только на hover. */
const OUTLINE_LINK_CLASS =
  'inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-xs font-semibold uppercase tracking-tight text-gray-900 transition-colors hover:border-black/[0.9] hover:bg-black/[0.9] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20';

/** Lucide `book-open` (ISC) — привычная иконка «база знаний / документация». */
export function BookOpenIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path d="M12 7v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ссылка на /help — полная (сайдбар) или иконка (свёрнутый сайдбар). */
export function KnowledgeBaseNavButton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Tooltip content="База знаний" openDelayMs={200}>
        <Link
          href="/help?tab=overview"
          className={`${OUTLINE_LINK_CLASS} h-9 w-9 shrink-0`}
          aria-label="База знаний"
        >
          <BookOpenIcon />
        </Link>
      </Tooltip>
    );
  }

  return (
    <Link href="/help?tab=overview" className={`${OUTLINE_LINK_CLASS} w-full gap-2 px-3 py-2.5`}>
      <BookOpenIcon className="h-4 w-4 shrink-0" />
      База знаний
    </Link>
  );
}
