import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCircleButton } from './IconCircleButton';
import { useDismissibleLayer } from './useDismissibleLayer';

function DotsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M12 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/** Портал закрывается до mouseup — без этого клик «пробивает» на карточку под меню. */
function suppressMenuPointerPassthrough(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function CardActionsMenu({
  items = [],
  triggerLabel = 'Действия',
  triggerVariant = 'gray100Menu',
  className = 'right-2 top-2',
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submenuKey, setSubmenuKey] = useState(null);
  const [submenuSide, setSubmenuSide] = useState('right');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, ready: false });
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0, ready: false });
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const submenuRef = useRef(null);
  const menuIdRef = useRef(`card-actions-menu-${Math.random().toString(36).slice(2)}`);
  const submenuCloseTimeoutRef = useRef(null);
  const submenuAnchorRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setSubmenuKey(null);
      submenuAnchorRef.current = null;
    }
  }, [open]);

  useEffect(
    () => () => {
      if (submenuCloseTimeoutRef.current != null) {
        window.clearTimeout(submenuCloseTimeoutRef.current);
        submenuCloseTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleOtherMenuOpen = (event) => {
      if (event?.detail?.id === menuIdRef.current) return;
      setOpen(false);
      setSubmenuKey(null);
    };
    window.addEventListener('card-actions-menu-open', handleOtherMenuOpen);
    return () => window.removeEventListener('card-actions-menu-open', handleOtherMenuOpen);
  }, []);

  useDismissibleLayer({
    open,
    refs: [rootRef, menuRef, submenuRef],
    onDismiss: () => setOpen(false),
  });

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
      const menuWidth = Math.max(160, menuEl?.offsetWidth || 160);
      const menuHeight = Math.max(40, menuEl?.offsetHeight || 180);
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
  }, [open, items, submenuKey]);

  useLayoutEffect(() => {
    if (!open || !submenuKey) {
      setSubmenuPosition((prev) => ({ ...prev, ready: false }));
      return undefined;
    }

    const updateSubmenuPosition = () => {
      const anchorEl = submenuAnchorRef.current;
      const submenuEl = submenuRef.current;
      if (!anchorEl) return;
      const anchorRect = anchorEl.getBoundingClientRect();
      const submenuWidth = Math.max(176, submenuEl?.offsetWidth || 176);
      const submenuHeight = Math.max(40, submenuEl?.offsetHeight || 120);
      const viewportW = window.innerWidth || 0;
      const viewportH = window.innerHeight || 0;
      const edgeGap = 8;
      const gap = 4;
      const rightSpace = viewportW - anchorRect.right;
      const leftSpace = anchorRect.left;
      const side = rightSpace >= submenuWidth + gap || rightSpace >= leftSpace ? 'right' : 'left';
      setSubmenuSide(side);
      let left =
        side === 'right' ? anchorRect.right + gap : Math.max(edgeGap, anchorRect.left - submenuWidth - gap);
      if (left + submenuWidth > viewportW - edgeGap) {
        left = Math.max(edgeGap, viewportW - edgeGap - submenuWidth);
      }
      let top = anchorRect.top;
      if (top + submenuHeight > viewportH - edgeGap) {
        top = Math.max(edgeGap, viewportH - edgeGap - submenuHeight);
      }
      setSubmenuPosition({ top, left, ready: true });
    };

    const raf = requestAnimationFrame(updateSubmenuPosition);
    window.addEventListener('resize', updateSubmenuPosition);
    window.addEventListener('scroll', updateSubmenuPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateSubmenuPosition);
      window.removeEventListener('scroll', updateSubmenuPosition, true);
    };
  }, [open, submenuKey, items]);

  const revealClassName = open
    ? 'pointer-events-auto opacity-100'
    : [
        'pointer-events-none opacity-0 transition-opacity duration-200',
        'group-hover:pointer-events-auto group-hover:opacity-100',
        'focus-within:pointer-events-auto focus-within:opacity-100',
      ].join(' ');

  const announceMenuOpen = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('card-actions-menu-open', {
        detail: { id: menuIdRef.current },
      }),
    );
  };

  const openSubmenuForItem = (itemKey, targetEl) => {
    if (typeof window === 'undefined' || !targetEl) return;
    submenuAnchorRef.current = targetEl;
    setSubmenuKey(itemKey);
  };

  const clearScheduledSubmenuClose = () => {
    if (submenuCloseTimeoutRef.current != null) {
      window.clearTimeout(submenuCloseTimeoutRef.current);
      submenuCloseTimeoutRef.current = null;
    }
  };

  const scheduleSubmenuClose = (itemKey) => {
    clearScheduledSubmenuClose();
    submenuCloseTimeoutRef.current = window.setTimeout(() => {
      setSubmenuKey((current) => (current === itemKey ? null : current));
      submenuCloseTimeoutRef.current = null;
    }, 140);
  };

  const activeSubmenuItem = items.find((item) => item.key === submenuKey);
  const activeSubmenuItems = Array.isArray(activeSubmenuItem?.submenuItems)
    ? activeSubmenuItem.submenuItems
    : [];

  const activateLeafMenuItem = (event, onSelect) => {
    suppressMenuPointerPassthrough(event);
    setSubmenuKey(null);
    onSelect?.();
    setOpen(false);
  };

  const menuDropdownEl =
    open && mounted && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        data-no-card-select="true"
        className={`fixed z-[120] min-w-[10rem] rounded-md bg-white shadow-md ${
          menuPosition.ready ? 'opacity-100' : 'opacity-0'
        }`}
        role="menu"
        style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
      >
        {items.map((item, index) => (
          <div
            key={item.key}
            className="relative"
            onMouseLeave={() => {
              if (submenuKey === item.key) scheduleSubmenuClose(item.key);
            }}
          >
            <button
              type="button"
              role="menuitem"
              disabled={Boolean(item.disabled)}
              onMouseDown={(event) => {
                if (item.disabled) return;
                const hasSubmenu = Array.isArray(item.submenuItems) && item.submenuItems.length > 0;
                if (hasSubmenu) return;
                activateLeafMenuItem(event, item.onSelect);
              }}
              onClick={(event) => {
                if (item.disabled) return;
                const hasSubmenu = Array.isArray(item.submenuItems) && item.submenuItems.length > 0;
                if (hasSubmenu) {
                  openSubmenuForItem(item.key, event.currentTarget);
                  return;
                }
                if (event.detail === 0) {
                  activateLeafMenuItem(event, item.onSelect);
                  return;
                }
                suppressMenuPointerPassthrough(event);
              }}
              onMouseEnter={(event) => {
                if (item.disabled) return;
                const hasSubmenu = Array.isArray(item.submenuItems) && item.submenuItems.length > 0;
                if (!hasSubmenu) return;
                clearScheduledSubmenuClose();
                openSubmenuForItem(item.key, event.currentTarget);
              }}
              onFocus={(event) => {
                if (item.disabled) return;
                const hasSubmenu = Array.isArray(item.submenuItems) && item.submenuItems.length > 0;
                if (!hasSubmenu) return;
                clearScheduledSubmenuClose();
                openSubmenuForItem(item.key, event.currentTarget);
              }}
              className={[
                'group/item flex w-full items-center border-b border-gray-200 px-3 py-3 text-left text-xs font-medium uppercase transition-colors',
                index === 0 ? 'rounded-t-md' : '',
                index === items.length - 1 ? 'border-b-0' : '',
                index === items.length - 1 ? 'rounded-b-md' : '',
                item.disabled
                  ? 'cursor-not-allowed text-gray-400'
                  : 'text-gray-900 hover:bg-accent hover:text-white',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.icon ? (
                <span className="mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center">{item.icon}</span>
              ) : null}
              <span className="truncate">{item.label}</span>
              {Array.isArray(item.submenuItems) && item.submenuItems.length > 0 ? (
                <span className="ml-auto inline-flex h-4 w-4 items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path
                      d="M7.5 4.5L12.5 10L7.5 15.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : null}
            </button>
          </div>
        ))}
      </div>
    ) : null;

  const submenuDropdownEl =
    open &&
    submenuKey &&
    activeSubmenuItems.length > 0 &&
    mounted &&
    typeof document !== 'undefined' ? (
      <div
        ref={submenuRef}
        data-no-card-select="true"
        className={`fixed z-[121] min-w-[11rem] rounded-md bg-white shadow-md ${
          submenuPosition.ready ? 'opacity-100' : 'opacity-0'
        }`}
        role="menu"
        style={{ top: `${submenuPosition.top}px`, left: `${submenuPosition.left}px` }}
        onMouseEnter={clearScheduledSubmenuClose}
        onMouseLeave={() => scheduleSubmenuClose(submenuKey)}
      >
        <div
          className={[
            'absolute top-0 h-full w-1 bg-transparent',
            submenuSide === 'left' ? '-right-1' : '-left-1',
          ]
            .filter(Boolean)
            .join(' ')}
          onMouseEnter={clearScheduledSubmenuClose}
          onMouseLeave={() => scheduleSubmenuClose(submenuKey)}
          aria-hidden
        />
        {activeSubmenuItems.map((subItem, subIndex) => (
          <button
            key={subItem.key}
            type="button"
            role="menuitem"
            disabled={Boolean(subItem.disabled)}
            onMouseDown={(event) => {
              if (subItem.disabled) return;
              activateLeafMenuItem(event, subItem.onSelect);
            }}
            onClick={(event) => {
              if (subItem.disabled) return;
              if (event.detail === 0) {
                activateLeafMenuItem(event, subItem.onSelect);
                return;
              }
              suppressMenuPointerPassthrough(event);
            }}
            className={[
              'group/item flex w-full items-center border-b border-gray-200 px-3 py-3 text-left text-xs font-medium uppercase transition-colors',
              subIndex === 0 ? 'rounded-t-md' : '',
              subIndex === activeSubmenuItems.length - 1 ? 'border-b-0' : '',
              subIndex === activeSubmenuItems.length - 1 ? 'rounded-b-md' : '',
              subItem.disabled
                ? 'cursor-not-allowed text-gray-400'
                : 'text-gray-900 hover:bg-accent hover:text-white',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {subItem.icon ? (
              <span className="mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center">{subItem.icon}</span>
            ) : null}
            <span className="truncate">{subItem.label}</span>
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <div
        ref={rootRef}
        className={['absolute z-20', revealClassName, className].filter(Boolean).join(' ')}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <IconCircleButton
          variant={triggerVariant}
          pressed={open}
          className="transition-all"
          onClick={() =>
            setOpen((value) => {
              const next = !value;
              if (next) announceMenuOpen();
              return next;
            })
          }
          aria-label={open ? 'Закрыть меню' : triggerLabel}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {open ? <CloseIcon /> : <DotsIcon />}
        </IconCircleButton>
      </div>
      {menuDropdownEl ? createPortal(menuDropdownEl, document.body) : null}
      {submenuDropdownEl ? createPortal(submenuDropdownEl, document.body) : null}
    </>
  );
}
