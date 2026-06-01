import { useEffect, useState } from 'react';
import {
  ensureCatalogCachesLoaded,
  type EnsureCatalogCachesOptions,
} from '../utils/ensureCatalogCachesLoaded';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';
import { readFontsourceCatalogCache } from '../utils/fontsourceCatalogCache';
import { readFontshareCatalogCache } from '../utils/fontshareCatalogCache';
import { readFontfabricTrialCatalogCache } from '../utils/fontfabricTrialCatalogCache';

/**
 * Фоновая подгрузка Google/Fontsource в session-кэш.
 * Возвращает revision — передать в useSavedLibraryDerivedState, чтобы пересобрать meta карточек.
 */
export function useCatalogCachesWarmup(
  enabled: boolean,
  options: EnsureCatalogCachesOptions,
): number {
  const needsGoogle = options.needsGoogle === true;
  const needsFontsource = options.needsFontsource === true;
  const needsFontshare = options.needsFontshare === true;
  const needsFontfabricTrial = options.needsFontfabricTrial === true;
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    if (!needsGoogle && !needsFontsource && !needsFontshare && !needsFontfabricTrial) {
      return undefined;
    }

    const googleReady = !needsGoogle || readGoogleFontCatalogCache().length > 0;
    const fontsourceReady = !needsFontsource || readFontsourceCatalogCache().length > 0;
    const fontshareReady = !needsFontshare || readFontshareCatalogCache().length > 0;
    const trialReady = !needsFontfabricTrial || readFontfabricTrialCatalogCache().length > 0;
    if (googleReady && fontsourceReady && fontshareReady && trialReady) return undefined;

    let cancelled = false;
    void ensureCatalogCachesLoaded({
      needsGoogle,
      needsFontsource,
      needsFontshare,
      needsFontfabricTrial,
    }).then((wrote) => {
      if (!cancelled && wrote) {
        setRevision((n) => n + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, needsFontshare, needsFontfabricTrial, needsFontsource, needsGoogle]);

  return revision;
}
