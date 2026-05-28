import type { ReactNode } from 'react';
import { EDITOR_PREVIEW_BOTTOM_BAR_CLASS } from './editorChromeClasses';
import { NewsNotificationsDock } from './NewsNotificationsDock';

export type EditorStatusBarProps = {
  leading?: ReactNode;
  center?: ReactNode;
  trailing?: ReactNode;
  beforeTrailing?: ReactNode;
  className?: string;
};

/**
 * Нижняя «хром»-полоса редактора: слева метрика, по центру контекст, справа действия.
 */
export function EditorStatusBar({
  leading = null,
  center = null,
  trailing,
  beforeTrailing = null,
  className = '',
}: EditorStatusBarProps) {
  return (
    <div className={`${EDITOR_PREVIEW_BOTTOM_BAR_CLASS} ${className}`.trim()}>
      <div className="relative z-20 flex min-w-0 max-w-[42%] shrink-0 items-center bg-white sm:max-w-[38%]">
        {leading != null && leading !== '' ? (
          <span className="truncate text-left text-xs font-semibold uppercase tabular-nums text-gray-800">
            {leading}
          </span>
        ) : (
          <span className="text-xs text-gray-400"> </span>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-8">
        {center ? (
          <div className="pointer-events-none max-w-[min(520px,calc(100%-20rem))] text-center text-xs font-semibold uppercase leading-snug text-gray-800 sm:max-w-[min(560px,calc(100%-18rem))]">
            {center}
          </div>
        ) : null}
      </div>
      <div className="relative z-20 ml-auto flex h-full shrink-0 items-stretch justify-end bg-white">
        {beforeTrailing}
        {trailing === undefined ? <NewsNotificationsDock /> : trailing}
      </div>
    </div>
  );
}
