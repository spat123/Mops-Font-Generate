import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  offsetTopToScrollAncestor,
  useScrollTop,
  useClientWidth,
} from './virtualScrollUtils';

function columnsFromWidth(w) {
  if (w >= 1280) return 10;
  if (w >= 1024) return 8;
  if (w >= 768) return 6;
  if (w >= 640) return 4;
  return 2;
}

const DEFAULT_ROW_GAP_PX = 12;

/**
 * Виртуализированная сетка: общий скролл у родителя, фиксированная оценка высоты строки.
 * @param {number=} props.columnCount — если задано, не вычислять число колонок по ширине (каталог Google).
 * @param {number=} props.rowGapPx — шаг между ячейками по обеим осям (px), по умолчанию 12.
 * @param {boolean=} props.seamlessGrid — без зазоров, общая сетка границ (border-l/t у контейнера, у ячеек — border-r/b).
 * @param {(w: number) => void=} props.onInnerWidth — ширина контейнера сетки (для внешней вёрстки).
 * @param {(range: { startIndex: number, endIndex: number }) => void=} props.onVisibleIndexRangeChange
 */
export function VirtualizedGlyphGrid({
  scrollParentEl,
  totalCount,
  estimatedRowHeightPx,
  renderItem,
  overscanRows = 2,
  columnCount: columnCountProp,
  rowGapPx = DEFAULT_ROW_GAP_PX,
  seamlessGrid = false,
  onInnerWidth,
  onVisibleIndexRangeChange,
}) {
  const anchorRef = useRef(null);
  const [widthHostEl, setWidthHostEl] = useState(null);

  const setWidthHostRef = useCallback((node) => {
    setWidthHostEl(node);
  }, []);

  const scrollTop = useScrollTop(scrollParentEl);
  const width = useClientWidth(widthHostEl);

  const [anchorOffset, setAnchorOffset] = useState(0);

  useLayoutEffect(() => {
    if (!scrollParentEl || !anchorRef.current) return;
    const measure = () => {
      setAnchorOffset(offsetTopToScrollAncestor(anchorRef.current, scrollParentEl));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) {
      ro.observe(scrollParentEl);
      if (anchorRef.current) ro.observe(anchorRef.current);
    }
    return () => {
      ro?.disconnect();
    };
  }, [scrollParentEl, width, totalCount]);

  useEffect(() => {
    if (typeof onInnerWidth !== 'function' || !widthHostEl) return;
    const w = widthHostEl.clientWidth;
    if (w > 0) onInnerWidth(w);
  }, [onInnerWidth, widthHostEl, width]);

  const cols = useMemo(() => {
    if (columnCountProp != null && columnCountProp > 0) {
      return Math.max(1, Math.floor(columnCountProp));
    }
    return Math.max(1, columnsFromWidth(width));
  }, [width, columnCountProp]);

  const rowH = Math.max(24, estimatedRowHeightPx);
  const gapPx = seamlessGrid ? 0 : rowGapPx;
  const rowStride = rowH + gapPx;
  const totalRows = Math.max(1, Math.ceil(Math.max(0, totalCount) / cols));

  const range = useMemo(() => {
    if (!scrollParentEl || width < 32) {
      const end = Math.min(totalCount, cols * 8);
      return { padTop: 0, padBottom: 0, start: 0, end };
    }
    const into = Math.max(0, scrollTop - anchorOffset);
    const firstRow = Math.min(totalRows - 1, Math.floor(into / rowStride));
    const startRow = Math.max(0, firstRow - overscanRows);
    const ch = scrollParentEl.clientHeight || 400;
    const rowsInView = Math.ceil(ch / rowStride) + 1 + overscanRows * 2;
    const endRow = Math.min(totalRows, startRow + rowsInView);
    const start = startRow * cols;
    const end = Math.min(totalCount, endRow * cols);
    const padTop = startRow * rowStride;
    const padBottom = (totalRows - endRow) * rowStride;
    return { padTop, padBottom, start, end };
  }, [
    scrollParentEl,
    scrollTop,
    anchorOffset,
    rowStride,
    cols,
    totalRows,
    totalCount,
    width,
    overscanRows,
  ]);

  useEffect(() => {
    if (typeof onVisibleIndexRangeChange !== 'function') return;
    if (range.end <= range.start) return;
    onVisibleIndexRangeChange({
      startIndex: range.start,
      endIndex: range.end - 1,
    });
  }, [onVisibleIndexRangeChange, range.start, range.end]);

  const cells = useMemo(() => {
    const out = [];
    for (let i = range.start; i < range.end; i++) {
      out.push(<React.Fragment key={i}>{renderItem(i)}</React.Fragment>);
    }
    return out;
  }, [range.start, range.end, renderItem]);

  return (
    <div ref={setWidthHostRef} className="w-full min-w-0">
      <div ref={anchorRef} className="h-0 w-full" aria-hidden />
      <div
        className="w-full"
        style={{
          paddingTop: range.padTop,
          paddingBottom: range.padBottom,
        }}
      >
        <div
          className={
            seamlessGrid ? 'grid w-full border-l border-t border-gray-200' : 'grid w-full'
          }
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            /** Совпадает с rowStride в виртуализации; иначе строки с «лёгким» контентом схлопываются */
            gridAutoRows: `${rowH}px`,
            gap: gapPx,
          }}
        >
          {cells}
        </div>
      </div>
    </div>
  );
}
