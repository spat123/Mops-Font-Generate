import React from 'react';

export function CountBadge({ count, className = '' }) {
  return (
    <span
      className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 px-3 text-sm tabular-nums uppercase font-semibold text-gray-500 ${className}`.trim()}
    >
      {count}
    </span>
  );
}
