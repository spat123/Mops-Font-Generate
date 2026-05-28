import { useEffect, useMemo, useState } from 'react';

/** Breakpoints и флаги layout тулбара сохранённой библиотеки. */
export function useSavedLibraryToolbarLayout() {
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setViewportW(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return useMemo(() => {
    const w = viewportW;
    return {
      viewportW: w,
      is2Col: w < 768,
      is4Col: w >= 768 && w < 1280,
      is5Col: w >= 1280 && w <= 1440,
      isWideRow: w >= 1280,
      isTightResetGap: w >= 1280 && w <= 1500,
      hideDownloadLabel: w <= 1440 && w >= 1024,
      searchOverlayEnabled: w <= 1920,
      resetLabel: w > 1440 ? 'Сбросить все' : 'Сбросить',
    };
  }, [viewportW]);
}
