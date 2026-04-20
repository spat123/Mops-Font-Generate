import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  offsetTopToScrollAncestor,
  useScrollTop,
} from './virtualScrollUtils';

/**
 * Одноколоночный список с переменной высотой строк; скролл у внешнего `scrollParentEl`.
 */
export function VirtualizedVariableList({
  scrollParentEl,
  /** Высоты строк по индексу (px) */
  itemHeights,
  renderItem,
  overscanPx = 96,
}) {
  const anchorRef = useRef(null);
  const scrollTop = useScrollTop(scrollParentEl);
  const [anchorOffset, setAnchorOffset] = useState(0);

  const n = itemHeights.length;

  const prefix = useMemo(() => {
    const p = [0];
    for (let i = 0; i < n; i++) {
      p.push(p[p.length - 1] + (itemHeights[i] ?? 0));
    }
    return p;
  }, [itemHeights, n]);

  const totalH = prefix.length > 0 ? prefix[prefix.length - 1] : 0;

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
    return () => ro?.disconnect();
  }, [scrollParentEl, n]);

  const range = useMemo(() => {
    if (!scrollParentEl || n === 0) {
      return { start: 0, end: 0, padTop: 0, padBottom: 0 };
    }
    const into = Math.max(0, scrollTop - anchorOffset);
    const ch = scrollParentEl.clientHeight || 400;
    const viewBottom = into + ch;
    const vTop = into - overscanPx;
    const vBottom = viewBottom + overscanPx;

    let start = 0;
    for (let i = 0; i < n; i++) {
      if (prefix[i + 1] > vTop) {
        start = i;
        break;
      }
    }
    let end = n;
    for (let i = start; i < n; i++) {
      if (prefix[i] >= vBottom) {
        end = i;
        break;
      }
    }
    if (end <= start) end = Math.min(n, start + 1);
    const padTop = prefix[start];
    const padBottom = totalH - prefix[end];
    return { start, end, padTop, padBottom };
  }, [
    scrollParentEl,
    scrollTop,
    anchorOffset,
    prefix,
    totalH,
    n,
    overscanPx,
  ]);

  const cells = useMemo(() => {
    const out = [];
    for (let i = range.start; i < range.end; i++) {
      out.push(<React.Fragment key={i}>{renderItem(i)}</React.Fragment>);
    }
    return out;
  }, [range.start, range.end, renderItem]);

  return (
    <div className="w-full min-w-0">
      <div ref={anchorRef} className="h-0 w-full" aria-hidden />
      <div
        className="w-full"
        style={{
          paddingTop: range.padTop,
          paddingBottom: range.padBottom,
        }}
      >
        {cells}
      </div>
    </div>
  );
}
