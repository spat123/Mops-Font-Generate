import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function ChevronDownIcon({ className = 'h-3 w-3' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M5 7h10l-5 6-5-6z" />
    </svg>
  );
}

function DownloadIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 0C12.5523 0 13 0.447715 13 1V13.5859L17.293 9.29297C17.6834 8.90254 18.3166 8.90254 18.707 9.29297C19.0974 9.68342 19.0974 10.3166 18.707 10.707L12.707 16.707C12.3166 17.0974 11.6834 17.0974 11.293 16.707L5.29297 10.707C4.90254 10.3166 4.90254 9.68342 5.29297 9.29297C5.68342 8.90254 6.31658 8.90254 6.70703 9.29297L11 13.5859V1C11 0.447715 11.4477 0 12 0Z" fill="currentColor" />
      <path d="M1 15C1.55228 15 2 15.4477 2 16V21C2 21.5523 2.44772 22 3 22H21C21.5523 22 22 21.5523 22 21V16C22 15.4477 22.4477 15 23 15C23.5523 15 24 15.4477 24 16V22.75C24 23.4404 23.4404 24 22.75 24H1.25C0.559644 24 0 23.4404 0 22.75V16C0 15.4477 0.447715 15 1 15Z" fill="currentColor" />
    </svg>
  );
}

export function CatalogDownloadSplitButton({
  disabled = false,
  onPrimaryClick,
  primaryLabel = 'Скачать',
  primaryAriaLabel = 'Скачать',
  menuItems = [],
  tone = 'light',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, ready: false });

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition((prev) => ({ ...prev, ready: false }));
      return undefined;
    }

    const updatePosition = () => {
      const triggerEl = rootRef.current;
      if (!triggerEl) return;
      const triggerRect = triggerEl.getBoundingClientRect();
      const menuEl = menuRef.current;
      const menuWidth = Math.max(208, menuEl?.offsetWidth || 208);
      const menuHeight = Math.max(40, menuEl?.offsetHeight || 220);
      const viewportW = window.innerWidth || 0;
      const viewportH = window.innerHeight || 0;
      const edgeGap = 8;
      const offsetY = 4;
      const spaceBelow = viewportH - triggerRect.bottom - edgeGap;
      const spaceAbove = triggerRect.top - edgeGap;
      const openDown = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;
      let top = openDown
        ? triggerRect.bottom + offsetY
        : Math.max(edgeGap, triggerRect.top - menuHeight - offsetY);
      if (top + menuHeight > viewportH - edgeGap) {
        top = Math.max(edgeGap, viewportH - edgeGap - menuHeight);
      }
      let left = triggerRect.right - menuWidth;
      if (left < edgeGap) left = edgeGap;
      if (left + menuWidth > viewportW - edgeGap) {
        left = Math.max(edgeGap, viewportW - edgeGap - menuWidth);
      }
      setMenuPosition({ top, left, ready: true });
    };

    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, menuItems]);

  const hasMenu = Array.isArray(menuItems) && menuItems.some((item) => !item?.hidden);
  const isAccent = tone === 'accent';
  const rootClassName = `relative inline-flex h-8 w-40.5 items-stretch ${className}`.trim();
  const primaryClassName = isAccent
    ? 'inline-flex items-center gap-1.5 w-full rounded-l-sm bg-accent px-3 text-xs uppercase font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-400'
    : 'inline-flex items-center gap-1.5 rounded-l-md border border-r-0 border-gray-200 bg-white/95 px-2 text-[11px] uppercase font-semibold text-gray-800 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-70';
  const secondaryClassName = isAccent
    ? `inline-flex w-7 items-center justify-center rounded-r-sm border-l border-white/30 bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-default disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 ${
        open ? 'bg-accent-hover' : ''
      }`
    : `inline-flex w-7 items-center justify-center rounded-r-md border border-gray-200 bg-white/95 text-gray-800 transition-colors hover:bg-white disabled:cursor-default disabled:opacity-70 ${
        open ? 'bg-white' : ''
      }`;

  return (
    <div ref={rootRef} className={rootClassName}>
      <button
        type="button"
        data-no-card-select="true"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onPrimaryClick?.();
        }}
        className={primaryClassName}
        aria-label={primaryAriaLabel}
      >
        <DownloadIcon />
        {primaryLabel}
      </button>
      <button
        type="button"
        data-no-card-select="true"
        disabled={disabled || !hasMenu}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={secondaryClassName}
        aria-label="Выбрать формат скачивания"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ChevronDownIcon />
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              className={`fixed z-[110] min-w-[13rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ${
                menuPosition.ready ? 'opacity-100' : 'opacity-0'
              }`}
              role="menu"
              style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
            >
              {(menuItems || [])
                .filter((item) => !item?.hidden)
                .map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    data-no-card-select="true"
                    disabled={item.disabled}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(false);
                      item.onSelect?.();
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold uppercase text-gray-900 transition-colors hover:bg-accent hover:text-white disabled:cursor-default disabled:opacity-50 ${
                      index > 0 ? 'border-t border-gray-200' : ''
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
