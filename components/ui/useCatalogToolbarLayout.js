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
    let rafId = null;
    const commitWidth = (nextWidth) => {
      const w = Math.round(Number(nextWidth) || 0);
      if (w <= 0) return;
      setGridInnerWidth((prev) => (prev === w ? prev : w));
    };
    const scheduleCommit = (nextWidth) => {
      if (typeof window === 'undefined') return;
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        commitWidth(nextWidth);
      });
    };

    // Первичное измерение — через contentRect если доступно, иначе clientWidth (один раз).
    commitWidth(catalogScrollEl.clientWidth);

    if (typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver((entries) => {
      const first = entries?.[0];
      const w = first?.contentRect?.width;
      scheduleCommit(w ?? catalogScrollEl.clientWidth);
    });
    ro.observe(catalogScrollEl);
    return () => {
      ro.disconnect();
      if (rafId != null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [autoMeasureGridWidth, catalogScrollEl, enabled]);

  useLayoutEffect(() => {
    if (!enabled || !trailingToolbarEl) {
      setTrailingToolbarW(0);
      return undefined;
    }
    let rafId = null;
    const commitWidth = (nextWidth) => {
      const w = Math.round(Number(nextWidth) || 0);
      setTrailingToolbarW((prev) => (prev === w ? prev : w));
    };
    const scheduleCommit = (nextWidth) => {
      if (typeof window === 'undefined') return;
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        commitWidth(nextWidth);
      });
    };

    commitWidth(trailingToolbarEl.getBoundingClientRect().width);
    if (typeof ResizeObserver !== 'function') return undefined;
    const ro = new ResizeObserver((entries) => {
      const first = entries?.[0];
      const w = first?.contentRect?.width;
      scheduleCommit(w ?? trailingToolbarEl.getBoundingClientRect().width);
    });
    ro.observe(trailingToolbarEl);
    return () => {
      ro.disconnect();
      if (rafId != null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafId);
      }
    };
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
