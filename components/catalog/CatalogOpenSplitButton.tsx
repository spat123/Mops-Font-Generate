import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { CatalogSourceTab } from '../../types/catalog';

export type CatalogOpenSplitButtonProps = {
  disabled?: boolean;
  onPrimaryClick?: () => unknown;
  onActionComplete?: () => void;
  primaryLabel?: string;
  primaryAriaLabel?: string;
  hidePrimaryLabel?: boolean;
  className?: string;
  onMenuOpenChange?: (open: boolean) => void;
  sourceTabs?: CatalogSourceTab[] | null;
  defaultSourceTabId?: string | null;
};
import { createPortal } from 'react-dom';
import { EditAssetIcon } from '../ui/EditAssetIcon';
import { linkIconUrl } from '../ui/editIconUrls';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';

function ChevronDownIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M5 7h10l-5 6-5-6z" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
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

function CheckIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
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

function OpenInEditorIcon() {
  return <EditAssetIcon src={linkIconUrl} className="h-3.5 w-3.5" />;
}

/**
 * «Открыть в редакторе» с выбором источника (Google / Fontsource), если их несколько.
 * sourceTabs: [{ id, triggerLabel, ariaLabel, Logo, onOpen }]
 */
export function CatalogOpenSplitButton({
  disabled = false,
  onPrimaryClick,
  onActionComplete,
  primaryLabel = 'Открыть',
  primaryAriaLabel = 'Открыть в редакторе',
  hidePrimaryLabel = false,
  className = '',
  onMenuOpenChange,
  sourceTabs = null,
  defaultSourceTabId = null,
}: CatalogOpenSplitButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, ready: false });
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'done'>('idle');
  const doneTimeoutRef = useRef<number | null>(null);

  const normalizedTabs = useMemo(() => {
    if (!Array.isArray(sourceTabs)) return [];
    return sourceTabs
      .filter((t) => t && typeof t === 'object' && t.id != null)
      .map((t) => ({ ...t, id: String(t.id) }));
  }, [sourceTabs]);

  const hasTabs = normalizedTabs.length > 1;
  const [activeTabId, setActiveTabId] = useState(() => {
    const preferred = defaultSourceTabId != null ? String(defaultSourceTabId) : '';
    if (preferred) return preferred;
    return hasTabs ? String(normalizedTabs[0]?.id || '') : '';
  });

  useEffect(() => {
    if (!hasTabs) return;
    const ids = new Set(normalizedTabs.map((t) => String(t.id)));
    setActiveTabId((prev) => (ids.has(String(prev)) ? prev : String(normalizedTabs[0]?.id || '')));
  }, [hasTabs, normalizedTabs]);

  const activeTab = hasTabs
    ? normalizedTabs.find((t) => String(t.id) === String(activeTabId)) || normalizedTabs[0] || null
    : null;

  const effectiveOnOpen = activeTab?.onOpen ?? onPrimaryClick;
  const effectiveAriaLabel = activeTab?.openAriaLabel ?? primaryAriaLabel;

  useEffect(() => {
    onMenuOpenChange?.(open || actionState !== 'idle');
  }, [open, actionState, onMenuOpenChange]);

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
      const menuWidth = Math.max(120, menuEl?.offsetWidth || 120);
      const menuHeight = Math.max(40, menuEl?.offsetHeight || 48);
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
      let left = triggerRect.left;
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
  }, [open, hasTabs, activeTabId]);

  const showSecondary = hasTabs;
  const busy = actionState === 'loading';
  const showDone = actionState === 'done';

  const runOpenAction = (openFn?: () => unknown) => {
    const fn = typeof openFn === 'function' ? openFn : effectiveOnOpen;
    if (typeof fn !== 'function') return;
    if (busy) return;
    if (doneTimeoutRef.current != null) {
      window.clearTimeout(doneTimeoutRef.current);
      doneTimeoutRef.current = null;
    }
    setActionState('loading');
    void (async () => {
      try {
        const result = fn();
        const ok = await Promise.resolve(result);
        if (ok === false) {
          setActionState('idle');
          return;
        }
        setActionState('done');
        onActionComplete?.();
        doneTimeoutRef.current = window.setTimeout(() => {
          setActionState('idle');
          doneTimeoutRef.current = null;
        }, 900);
      } catch {
        setActionState('idle');
      }
    })();
  };

  const runOpenWithFeedback = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    runOpenAction();
  };

  const primaryIcon = busy ? <SpinnerIcon /> : showDone ? <CheckIcon /> : <OpenInEditorIcon />;

  const menuDropdownEl = (
    <div
      ref={menuRef}
      className={`fixed z-[110] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ${
        menuPosition.ready ? 'opacity-100' : 'opacity-0'
      }`}
      role="menu"
      style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        {normalizedTabs.map((t) => {
          const active = String(t.id) === String(activeTabId);
          const TabLogo = t.Logo;
          return (
            <button
              key={String(t.id)}
              type="button"
              data-no-card-select="true"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                setActiveTabId(String(t.id));
                setOpen(false);
                runOpenAction(t.onOpen);
              }}
              className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
                active
                  ? 'border-accent bg-accent text-white'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-black/[0.9] hover:bg-black/[0.9] hover:text-white'
              }`}
              aria-label={t.ariaLabel || t.triggerLabel || String(t.id)}
              aria-pressed={active}
              title={t.triggerLabel || String(t.id)}
            >
              {TabLogo ? (
                <TabLogo className={`h-4 w-auto max-h-4 object-contain ${active ? 'brightness-0 invert' : ''}`} />
              ) : (
                <span className="text-xs font-semibold uppercase">{t.triggerLabel || String(t.id)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={`relative inline-flex h-9 items-stretch overflow-hidden rounded-md ${className}`.trim()}>
      <button
        type="button"
        data-no-card-select="true"
        disabled={disabled || busy}
        onClick={runOpenWithFeedback}
        className={`inline-flex h-9 min-w-0 flex-1 items-center ${
          hidePrimaryLabel ? 'justify-center px-3' : 'gap-2 px-4'
        } ${showSecondary ? 'rounded-l-md' : 'rounded-md'} bg-white text-xs uppercase font-semibold text-gray-800 transition-colors hover:bg-white active:bg-white disabled:cursor-default disabled:opacity-70`}
        aria-label={effectiveAriaLabel}
      >
        {primaryIcon}
        {!hidePrimaryLabel ? <span className="truncate">{primaryLabel}</span> : null}
      </button>
      {showSecondary ? (
        <button
          type="button"
          data-no-card-select="true"
          disabled={disabled || busy}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-r-md border-l border-gray-200 bg-white text-gray-800 transition-colors hover:bg-white active:bg-white disabled:cursor-default disabled:opacity-70 ${
            open ? 'bg-white' : ''
          }`}
          aria-label="Выбрать источник для открытия"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <ChevronDownIcon />
        </button>
      ) : null}
      {open && typeof document !== 'undefined' ? createPortal(menuDropdownEl, document.body) : null}
    </div>
  );
}
