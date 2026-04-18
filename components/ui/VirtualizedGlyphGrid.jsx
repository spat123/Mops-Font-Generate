import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

/** Сумма offsetTop по цепочке offsetParent до scroll-контейнера */
function offsetTopToScrollAncestor(el, scrollAncestor) {
  if (!el || !scrollAncestor) return 0;
  let top = 0;
  let n = el;
  while (n && n !== scrollAncestor) {
    top += n.offsetTop;
    n = n.offsetParent;
  }
  if (n === scrollAncestor) return top;
  return 0;
}

function columnsFromWidth(w) {
  if (w >= 1280) return 10;
  if (w >= 1024) return 8;
  if (w >= 768) return 6;
  if (w >= 640) return 4;
  return 2;
}

function subscribeScroll(el, onChange) {
  if (!el) return () => {};
  el.addEventListener('scroll', onChange, { passive: true });
  return () => el.removeEventListener('scroll', onChange);
}

function useScrollTop(scrollEl) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeScroll(scrollEl, onStoreChange),
    () => scrollEl?.scrollTop ?? 0,
    () => 0,
  );
}

/** Совпадает с `gap-3` у сетки — иначе общая высота контента занижена и нельзя доскроллить до конца */
const GRID_ROW_GAP_PX = 12;

function subscribeResize(el, onChange) {
  if (!el || typeof ResizeObserver === 'undefined') return () => {};
  const ro = new ResizeObserver(() => onChange());
  ro.observe(el);
  return () => ro.disconnect();
}

function useClientWidth(el) {
  return useSyncExternalStore(
    (onStoreChange) => subscribeResize(el, onStoreChange),
    () => el?.clientWidth ?? 0,
    () => 0,
  );
}

/**
 * Виртуализированная сетка глифов: общий скролл у родителя, фиксированная оценка высоты строки.
 * Высота строки фиксированная (оценка) — для скроллбара и диапазона индексов.
 */
export function VirtualizedGlyphGrid({
  scrollParentEl,
  totalCount,
  estimatedRowHeightPx,
  renderItem,
  /** Доп. строк сетки сверху/снизу вне экрана */
  overscanRows = 2,
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

  const cols = useMemo(() => Math.max(1, columnsFromWidth(width)), [width]);
  const rowH = Math.max(80, estimatedRowHeightPx);
  /** Одна «логическая» строка сетки: карточка + вертикальный gap */
  const rowStride = rowH + GRID_ROW_GAP_PX;
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
          className="grid w-full gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {cells}
        </div>
      </div>
    </div>
  );
}
