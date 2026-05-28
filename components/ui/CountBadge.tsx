import type { ReactNode } from 'react';

export type CountBadgeProps = {
  count: ReactNode;
  className?: string;
};

export function CountBadge({ count, className = '' }: CountBadgeProps) {
  return (
    <span
      className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 px-3 text-sm tabular-nums uppercase font-semibold text-gray-500 ${className}`.trim()}
    >
      {count}
    </span>
  );
}
