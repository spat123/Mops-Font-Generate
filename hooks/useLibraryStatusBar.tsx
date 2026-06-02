import React, { useMemo } from 'react';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';
import { readFontsourceCatalogCache } from '../utils/fontsourceCatalogCache';
import { readFontshareCatalogCache } from '../utils/fontshareCatalogCache';
import { readFontfabricTrialCatalogCache } from '../utils/fontfabricTrialCatalogCache';
import { formatUnifiedCatalogAvailabilityShort, getUnifiedCatalogStats } from '../utils/catalogUnionStats';
import { getBillingCopy } from '../utils/billingCopy';
import type { SavedLibraryRecord } from '../types/editorFonts';

type LibraryAuthSlice = {
  isPro?: boolean;
  planName?: string;
};

type StatusBarContent = {
  leading: string;
  center: React.ReactNode;
};

type UseLibraryStatusBarParams = {
  fontsLibraryTab: string;
  activeSavedLibrary: SavedLibraryRecord | null;
  libraryAuthValue: LibraryAuthSlice;
};

/**
 * Контент статус-бара экрана «Все шрифты» (каталог / библиотека / список библиотек).
 */
export function useLibraryStatusBar({
  fontsLibraryTab,
  activeSavedLibrary,
  libraryAuthValue,
}: UseLibraryStatusBarParams): StatusBarContent {
  return useMemo(() => {
    if (fontsLibraryTab === 'catalog') {
      const stats = getUnifiedCatalogStats({
        googleItems: readGoogleFontCatalogCache(),
        fontsourceItems: readFontsourceCatalogCache(),
        fontshareItems: readFontshareCatalogCache(),
        trialItems: readFontfabricTrialCatalogCache(),
      });
      const loaded = Number(stats?.uniqueFamiliesAll || 0) > 0;
      const leading = !loaded
        ? 'Каталог: загрузка…'
        : formatUnifiedCatalogAvailabilityShort(stats);
      return {
        leading,
        center: <span className="truncate uppercase">Каталог</span>,
      };
    }

    if (activeSavedLibrary) {
      const n = activeSavedLibrary.fonts?.length ?? 0;
      return {
        leading: `Шрифтов: ${n} шт.`,
        center: (
          <span className="truncate uppercase" title={activeSavedLibrary.name}>
            {activeSavedLibrary.name}
          </span>
        ),
      };
    }

    const planBadgeShort = libraryAuthValue.planName || (libraryAuthValue.isPro ? 'Pro' : 'Free');
    return {
      leading: '',
      center: (
        <span className="flex min-w-0 max-w-full items-center justify-center gap-2">
          <span className="truncate uppercase">Библиотеки</span>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              libraryAuthValue.isPro ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-900'
            }`}
            title={getBillingCopy().badgeTitle}
          >
            {planBadgeShort}
          </span>
        </span>
      ),
    };
  }, [fontsLibraryTab, activeSavedLibrary, libraryAuthValue.isPro, libraryAuthValue.planName]);
}
