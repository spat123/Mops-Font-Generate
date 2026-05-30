import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { CatalogDownloadButtonProps } from '../../types/catalog';

export type CatalogDownloadSplitButtonProps = CatalogDownloadButtonProps & {
  disabled?: boolean;
  onActionComplete?: () => void;
  primaryCount?: number;
  hidePrimaryLabel?: boolean;
  tone?: 'light' | 'accent';
  className?: string;
  secondaryButtonClassName?: string;
  onMenuOpenChange?: (open: boolean) => void;
  heightClass?: string;
  layout?: 'compact' | 'comfortable';
};
import { createPortal } from 'react-dom';
import { EditAssetIcon } from '../ui/EditAssetIcon';
import { downloudIconUrl } from '../ui/editIconUrls';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { FontStyleDownloadDialog } from './FontStyleDownloadDialog';

function ChevronDownIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M5 7h10l-5 6-5-6z" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-4 w-4' }: { className?: string }) {
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

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
  primaryCount = 0,
  hidePrimaryLabel = false,
  menuItems = [],
  tone = 'light',
  className = '',
  secondaryButtonClassName = '',
  onMenuOpenChange,
  heightClass = '',
  layout = 'compact',
  stylePicker = null,
  sourceTabs = null,
  defaultSourceTabId = null,
}: CatalogDownloadSplitButtonProps) {
  const [open, setOpen] = useState(false);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, ready: false });
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'done'>('idle');
  const doneTimeoutRef = useRef<number | null>(null);

  const normalizedTabs = useMemo(() => {
    if (!Array.isArray(sourceTabs)) return [];
    return sourceTabs
      .filter((t) => t && typeof t === 'object' && t.id != null)
      .map((t) => ({
        ...t,
        id: String(t.id),
      }));
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

  const effectivePrimaryLabel = activeTab?.primaryLabel ?? primaryLabel;
  const effectivePrimaryAriaLabel = activeTab?.primaryAriaLabel ?? primaryAriaLabel;
  const effectiveOnPrimaryClick = activeTab?.onPrimaryClick ?? onPrimaryClick;
  const effectiveMenuItems = activeTab?.menuItems ?? menuItems;
  const effectiveStylePicker = activeTab?.stylePicker ?? stylePicker;

  useEffect(() => {
    onMenuOpenChange?.(open || styleDialogOpen || actionState !== 'idle');
  }, [open, styleDialogOpen, actionState, onMenuOpenChange]);

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
  }, [open, effectiveMenuItems, effectiveStylePicker, hasTabs, activeTabId]);

  const visibleMenuItems = (effectiveMenuItems || []).filter((item) => !item?.hidden);
  const hasStylePicker =
    effectiveStylePicker &&
    Array.isArray(effectiveStylePicker.styles) &&
    effectiveStylePicker.styles.length > 0 &&
    typeof effectiveStylePicker.onDownload === 'function';
  const hasMenu = visibleMenuItems.length > 0 || hasStylePicker;
  const showSecondary = hasMenu || hasTabs;
  const isAccent = tone === 'accent';
  const roomy = layout === 'comfortable';
  const resolvedHeightClass = heightClass || (roomy ? 'h-9' : 'h-8');
  const primaryContentClassName = hidePrimaryLabel
    ? 'justify-center px-3'
    : roomy
      ? 'gap-2 px-4'
      : 'gap-1.5 px-3';
  const rootClassName = `relative inline-flex ${resolvedHeightClass} w-40.5 items-stretch overflow-hidden rounded-sm ${className}`.trim();
  const primaryClassName = isAccent
    ? `inline-flex ${resolvedHeightClass} min-w-0 flex-1 items-center ${primaryContentClassName} ${showSecondary ? 'rounded-l-sm' : 'rounded-sm'} bg-accent text-xs uppercase font-semibold leading-none text-white cursor-pointer transition-colors hover:bg-accent-hover active:bg-accent-hover disabled:cursor-default disabled:bg-accent/60 disabled:text-white/80`
    : `inline-flex ${resolvedHeightClass} min-w-0 flex-1 items-center ${hidePrimaryLabel ? 'justify-center px-3' : roomy ? 'gap-2 px-4' : 'gap-1.5 px-2'} ${showSecondary ? 'rounded-l-sm' : 'rounded-sm'} bg-white text-xs uppercase font-semibold leading-none text-gray-800 cursor-pointer transition-colors hover:bg-white active:bg-white disabled:cursor-default disabled:bg-white disabled:text-gray-400 disabled:opacity-60`;
  const secondaryClassName = `${
    isAccent
      ? `inline-flex ${resolvedHeightClass} w-9 shrink-0 items-center justify-center rounded-r-sm border-l border-white/30 bg-accent text-white cursor-pointer transition-colors hover:bg-accent-hover active:bg-accent-hover disabled:cursor-default disabled:border-white/20 disabled:bg-accent/60 disabled:text-white/80 ${
          open ? 'bg-accent-hover' : ''
        }`
      : `inline-flex ${resolvedHeightClass} w-9 shrink-0 items-center justify-center rounded-r-sm border-l border-gray-200 bg-white text-gray-800 cursor-pointer transition-colors hover:bg-white active:bg-white disabled:cursor-default disabled:border-gray-200 disabled:bg-white disabled:text-gray-400 disabled:opacity-60 ${
          open ? 'bg-white' : ''
        }`
  } ${secondaryButtonClassName}`.trim();

  const busy = actionState === 'loading';
  const showDone = actionState === 'done';
  const primaryDisabled = disabled || busy;
  const chevronDisabled = disabled || busy || !hasMenu;
  const showCountBadge = Number.isFinite(primaryCount) && primaryCount > 0;
  const countBadgeClassName = `inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums ${
    isAccent ? 'bg-white text-accent' : 'bg-gray-100 text-gray-600'
  }`.trim();

  const runActionWithFeedback = (action?: () => unknown) => {
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

  const menuDropdownEl = (
    <div
      ref={menuRef}
      className={`fixed z-[110] min-w-[13rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ${
        menuPosition.ready ? 'opacity-100' : 'opacity-0'
      }`}
      role="menu"
      style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
    >
      {hasTabs ? (
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-2 py-2">
          {normalizedTabs.map((t) => {
            const active = String(t.id) === String(activeTabId);
            const TabLogo = t.Logo;
            return (
              <button
                key={String(t.id)}
                type="button"
                data-no-card-select="true"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveTabId(String(t.id));
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
      ) : null}
      {visibleMenuItems.map((item, index) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            data-no-card-select="true"
            disabled={item.disabled}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              setOpen(false);
              runActionWithFeedback(item.onSelect);
            }}
            className={`flex w-full cursor-pointer items-center px-3 text-left text-xs font-semibold uppercase text-gray-900 transition-colors hover:bg-accent hover:text-white disabled:cursor-default disabled:opacity-50 ${
              roomy ? 'py-3.5' : 'py-2.5'
            } ${index > 0 ? 'border-t border-gray-200' : ''}`}
          >
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      {hasStylePicker ? (
        <button
          key="styles"
          type="button"
          role="menuitem"
          data-no-card-select="true"
          disabled={effectiveStylePicker?.disabled}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
            setStyleDialogOpen(true);
          }}
          className={`flex w-full cursor-pointer items-center px-3 text-left text-xs font-semibold uppercase text-gray-900 transition-colors hover:bg-accent hover:text-white disabled:cursor-default disabled:opacity-50 ${
            roomy ? 'py-3.5' : 'py-2.5'
          } ${visibleMenuItems.length > 0 ? 'border-t border-gray-200' : ''}`}
        >
          <span className="truncate">Начертания</span>
        </button>
      ) : null}
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
          runActionWithFeedback(effectiveOnPrimaryClick);
        }}
        className={primaryClassName}
        aria-label={effectivePrimaryAriaLabel}
      >
        {busy ? (
          <SpinnerIcon className={roomy ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        ) : showDone ? (
          <CheckIcon className={roomy ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        ) : (
          <EditAssetIcon src={downloudIconUrl} className="h-4 w-4" />
        )}
        {!hidePrimaryLabel ? <span className="truncate">{effectivePrimaryLabel}</span> : null}
        {showCountBadge ? <span className={countBadgeClassName}>{primaryCount}</span> : null}
      </button>
      {showSecondary ? (
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
      ) : null}
      {open && typeof document !== 'undefined' ? createPortal(menuDropdownEl, document.body) : null}
      <FontStyleDownloadDialog
        open={styleDialogOpen}
        onClose={() => setStyleDialogOpen(false)}
        familyLabel={effectiveStylePicker?.familyLabel}
        styles={effectiveStylePicker?.styles}
        formats={effectiveStylePicker?.formats}
        onDownload={effectiveStylePicker?.onDownload}
      />
    </div>
  );
}
