import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';

export type UseCatalogToolbarLayoutParams = {
  trailingToolbar?: ReactNode;
  gridGapPx?: number;
  gridColsResolver?: (viewportW: number) => number;
  autoMeasureGridWidth?: boolean;
  enabled?: boolean;
};

export function useCatalogToolbarLayout({
  trailingToolbar = null,
  gridGapPx = 16,
  gridColsResolver,
  autoMeasureGridWidth = false,
  enabled = true,
}: UseCatalogToolbarLayoutParams = {}) {
  const [gridInnerWidth, setGridInnerWidth] = useState<number | null>(null);
  const [catalogScrollEl, setCatalogScrollEl] = useState<HTMLElement | null>(null);
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const [trailingToolbarEl, setTrailingToolbarEl] = useState<HTMLElement | null>(null);
  const [trailingToolbarW, setTrailingToolbarW] = useState(0);

  useIsomorphicLayoutEffect(() => {
    if (!enabled) return undefined;
    setViewportW(window.innerWidth);
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled]);

  const setCatalogScrollContainer = useCallback((node: HTMLElement | null) => {
    setCatalogScrollEl(node instanceof HTMLElement ? node : null);
  }, []);

  const setTrailingToolbarContainer = useCallback((node: HTMLElement | null) => {
    setTrailingToolbarEl(node instanceof HTMLElement ? node : null);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!enabled || !autoMeasureGridWidth) {
      setGridInnerWidth(null);
      return undefined;
    }
    if (!catalogScrollEl) {
      return undefined;
    }
    let rafId: number | null = null;
    const commitWidth = (nextWidth: number) => {
      const w = Math.round(Number(nextWidth) || 0);
      if (w <= 0) return;
      setGridInnerWidth((prev) => (prev === w ? prev : w));
    };
    const scheduleCommit = (nextWidth: number) => {
      if (typeof window === 'undefined') return;
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        commitWidth(nextWidth);
      });
    };

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

  useIsomorphicLayoutEffect(() => {
    if (!enabled || !trailingToolbarEl) {
      setTrailingToolbarW(0);
      return undefined;
    }
    let rafId: number | null = null;
    const commitWidth = (nextWidth: number) => {
      const w = Math.round(Number(nextWidth) || 0);
      setTrailingToolbarW((prev) => (prev === w ? prev : w));
    };
    const scheduleCommit = (nextWidth: number) => {
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
      ? Math.max(0, twoCardWidthPx - (trailingToolbar ? trailingToolbarW + gridGapPx : 0))
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

export type CatalogToolbarLayout = ReturnType<typeof useCatalogToolbarLayout>;
