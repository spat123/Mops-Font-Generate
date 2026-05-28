import type { HTMLAttributes, ReactNode } from 'react';

/**
 * Обёртка для пары кнопок «основное действие + раскрывающееся меню» (или второй зоны клика).
 * Внутрь кладутся два {@link AppButton} (или нативных `button`) подряд.
 */
const ROOT_CLASS =
  'inline-flex min-w-0 overflow-hidden rounded-md border border-gray-200 bg-white [&>button]:rounded-none [&>button]:border-0 [&>button]:shadow-none [&>button:first-child]:min-w-0 [&>button:first-child]:flex-1 [&>button:last-child]:w-9 [&>button:last-child]:shrink-0 [&>button+button]:border-l [&>button+button]:border-gray-200';

export type AppButtonSplitProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function AppButtonSplit({ className = '', ...rest }: AppButtonSplitProps) {
  return <div role="group" className={`${ROOT_CLASS} ${className}`.trim()} {...rest} />;
}
