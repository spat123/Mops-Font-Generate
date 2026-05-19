import React from 'react';

/**
 * Двухколоночный макет страницы «Поделиться» (как auth): слева список шрифтов, справа панель действий.
 */
export function LibraryShareSplitLayout({ listPanel, downloadPanel }) {
  return (
    <div className="min-h-screen [font-feature-settings:normal] md:grid md:min-h-screen md:grid-cols-2 md:items-stretch">
      <aside className="flex min-h-[50vh] flex-col bg-gray-50 p-3 sm:p-4 md:min-h-screen">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          {listPanel}
        </div>
      </aside>
      <div className="flex min-h-screen flex-col bg-white md:min-h-screen">
        <div className="mx-auto flex min-h-0 w-full max-w-[24rem] flex-1 flex-col px-6 py-10 sm:px-8 md:py-12">
          <div className="min-h-0 flex-1">{downloadPanel}</div>
        </div>
      </div>
    </div>
  );
}
