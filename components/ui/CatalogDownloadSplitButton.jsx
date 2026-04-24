import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditAssetIcon } from './EditAssetIcon';
import { downloudIconUrl } from './editIconUrls';
import { useDismissibleLayer } from './useDismissibleLayer';

function ChevronDownIcon({ className = 'h-3 w-3' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M5 7h10l-5 6-5-6z" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} animate-spin text-red-500`.trim()}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={2} />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="14 43"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      className={`${className} text-red-500`.trim()}
      aria-hidden
    >
      <path
        d="M4.5 10.5L8.25 14.25L15.5 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CatalogDownloadSplitButton({
  disabled = false,
  onPrimaryClick,
  onActionComplete,
  primaryLabel = 'Скачать',
  primaryAriaLabel = 'Скачать',
  menuItems = [],
  tone = 'light',
  className = '',
  secondaryButtonClassName = '',
  onMenuOpenChange,
  /** comfortable — выше кнопки и больше горизонтальные отступы (оверлей карточки каталога) */
  layout = 'compact',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, ready: false });
  const [actionState, setActionState] = useState('idle'); // idle | loading | done
  const doneTimeoutRef = useRef(null);

  useEffect(() => {
    onMenuOpenChange?.(open);
  }, [open, onMenuOpenChange]);

  useDismissibleLayer({
    open,
    refs: [rootRef, menuRef],
    onDismiss: () => setOpen(false),
  });

  useEffect(() => {
    return () => {
      if (doneTimeoutRef.current != null) {
        window.clearTimeout(doneTimeoutRef.current);
        doneTimeoutRef.current = null;
      }
    };
  }, []);

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
  const roomy = layout === 'comfortable';
  const rootClassName = `relative inline-flex ${roomy ? 'h-9' : 'h-8'} w-40.5 items-stretch ${className}`.trim();
  const primaryClassName = isAccent
    ? `inline-flex items-center ${roomy ? 'gap-2 px-4' : 'gap-1.5 px-3'} w-full rounded-l-md bg-accent text-xs uppercase font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-400`
    : `inline-flex items-center ${roomy ? 'gap-2 px-4' : 'gap-1.5 px-2'} rounded-l-md bg-white text-xs uppercase font-semibold text-gray-800 transition-colors hover:bg-white disabled:cursor-default`;
  const secondaryClassName = `${
    isAccent
      ? `inline-flex ${roomy ? 'w-9' : 'w-8'} items-center justify-center rounded-r-md border-l border-white/30 bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-default disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 ${
          open ? 'bg-accent-hover' : ''
        }`
      : `inline-flex ${roomy ? 'w-9' : 'w-7'} items-center justify-center rounded-r-md border-l border-gray-200 bg-white text-gray-800 transition-colors hover:bg-white disabled:cursor-default ${
          open ? 'bg-white' : ''
        }`
  } ${secondaryButtonClassName}`.trim();

  const busy = actionState === 'loading';
  const showDone = actionState === 'done';
  const primaryDisabled = disabled || busy;
  const chevronDisabled = disabled || busy || !hasMenu;

  const runActionWithFeedback = (action) => {
    if (busy) return;
    if (doneTimeoutRef.current != null) {
      window.clearTimeout(doneTimeoutRef.current);
      doneTimeoutRef.current = null;
    }
    setActionState('loading');
    void (async () => {
      try {
        const result = action?.();
        const ok = await Promise.resolve(result);
        if (ok === false) {
          setActionState('idle');
          return;
        }
        setActionState('done');
        doneTimeoutRef.current = window.setTimeout(() => {
          setActionState('idle');
          doneTimeoutRef.current = null;
        }, 900);
      } catch {
        setActionState('idle');
      }
    })();
  };

  const menuDropdownEl = (
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
              runActionWithFeedback(item.onSelect);
              onActionComplete?.();
            }}
            className={`flex w-full items-center px-3 text-left text-xs font-semibold uppercase text-gray-900 transition-colors hover:bg-accent hover:text-white disabled:cursor-default disabled:opacity-50 ${
              roomy ? 'py-3.5' : 'py-2.5'
            } ${index > 0 ? 'border-t border-gray-200' : ''}`}
          >
            <span className="truncate">{item.label}</span>
          </button>
        ))}
    </div>
  );

  return (
    <div ref={rootRef} className={rootClassName}>
      <button
        type="button"
        data-no-card-select="true"
        disabled={primaryDisabled}
        onClick={(event) => {
          event.stopPropagation();
          runActionWithFeedback(onPrimaryClick);
          onActionComplete?.();
        }}
        className={primaryClassName}
        aria-label={primaryAriaLabel}
      >
        {busy ? (
          <SpinnerIcon className={roomy ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        ) : showDone ? (
          <CheckIcon className={roomy ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        ) : (
          <EditAssetIcon src={downloudIconUrl} className="h-4 w-4" />
        )}
        {primaryLabel}
      </button>
      <button
        type="button"
        data-no-card-select="true"
        disabled={chevronDisabled}
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
      {open && typeof document !== 'undefined' ? createPortal(menuDropdownEl, document.body) : null}
    </div>
  );
}
