import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

export function useCatalogToolbarLayout({
  trailingToolbar = null,
  gridGapPx = 16,
  gridColsResolver,
  autoMeasureGridWidth = false,
  enabled = true,
}) {
  const [gridInnerWidth, setGridInnerWidth] = useState(null);
  const [catalogScrollEl, setCatalogScrollEl] = useState(null);
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const [trailingToolbarEl, setTrailingToolbarEl] = useState(null);
  const [trailingToolbarW, setTrailingToolbarW] = useState(0);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    setViewportW(window.innerWidth);
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled]);

  const setCatalogScrollContainer = useCallback((node) => {
    setCatalogScrollEl(node instanceof HTMLElement ? node : null);
  }, []);

  const setTrailingToolbarContainer = useCallback((node) => {
    setTrailingToolbarEl(node instanceof HTMLElement ? node : null);
  }, []);

  useLayoutEffect(() => {
    if (!enabled || !autoMeasureGridWidth) {
      setGridInnerWidth(null);
      return undefined;
    }
    if (!catalogScrollEl) {
      return undefined;
    }
    const measure = () => {
      const w = catalogScrollEl.clientWidth;
      if (Number.isFinite(w) && w > 0) {
        setGridInnerWidth(w);
      }
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(catalogScrollEl);
    return () => ro.disconnect();
  }, [autoMeasureGridWidth, catalogScrollEl, enabled]);

  useLayoutEffect(() => {
    if (!enabled || !trailingToolbarEl) {
      setTrailingToolbarW(0);
      return undefined;
    }
    const measure = () => {
      const w = trailingToolbarEl.getBoundingClientRect().width;
      setTrailingToolbarW(Number.isFinite(w) ? w : 0);
    };
    measure();
    if (typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(trailingToolbarEl);
    return () => ro.disconnect();
  }, [enabled, trailingToolbarEl]);

  const gridCols = useMemo(() => {
    if (typeof gridColsResolver === 'function') return gridColsResolver(viewportW);
    return 2;
  }, [gridColsResolver, viewportW]);

  const oneCardWidthPx =
    gridInnerWidth != null && gridInnerWidth > 0
      ? (gridInnerWidth - (gridCols - 1) * gridGapPx) / gridCols
      : null;
  const toolbarAlignToGrid = oneCardWidthPx != null && viewportW >= 640;
  const twoCardWidthPx = toolbarAlignToGrid ? oneCardWidthPx * 2 + gridGapPx : null;
  const searchWidthPx =
    toolbarAlignToGrid && twoCardWidthPx != null
      ? Math.max(
          0,
          twoCardWidthPx - (trailingToolbar ? trailingToolbarW + gridGapPx : 0),
        )
      : null;

  return {
    viewportW,
    catalogScrollEl,
    setCatalogScrollContainer,
    setTrailingToolbarContainer,
    setGridInnerWidth,
    gridInnerWidth,
    gridCols,
    oneCardWidthPx,
    toolbarAlignToGrid,
    searchWidthPx,
  };
}
