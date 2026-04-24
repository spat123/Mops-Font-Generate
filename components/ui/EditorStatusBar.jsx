import React from 'react';
import { EDITOR_PREVIEW_BOTTOM_BAR_CLASS } from './editorChromeClasses';
import { EditAssetIcon } from './EditAssetIcon';
import { notificationIconUrl } from './editIconUrls';

function DefaultTrailing() {
  return (
    <button
      type="button"
      aria-label="Уведомления"
      className="flex h-full min-h-12 w-12 shrink-0 items-center justify-center border-l border-gray-200 px-2 text-gray-800 transition-colors hover:text-accent"
    >
      <EditAssetIcon src={notificationIconUrl} className="h-4 w-4" />
    </button>
  );
}

/**
 * Нижняя «хром»-полоса редактора: слева краткая метрика, по центру контекст, справа действия.
 */
export function EditorStatusBar({ leading = null, center = null, trailing, beforeTrailing = null, className = '' }) {
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
        {trailing === undefined ? <DefaultTrailing /> : trailing}
      </div>
    </div>
  );
}
