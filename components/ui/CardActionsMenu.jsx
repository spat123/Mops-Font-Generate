import React, { useEffect, useRef, useState } from 'react';
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

export function CardActionsMenu({
  items = [],
  triggerLabel = 'Действия',
  triggerVariant = 'gray100Menu',
  className = 'right-2 top-2',
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const [submenuKey, setSubmenuKey] = useState(null);
  const [submenuSide, setSubmenuSide] = useState('right');
  const rootRef = useRef(null);
  const menuIdRef = useRef(`card-actions-menu-${Math.random().toString(36).slice(2)}`);
  const submenuCloseTimeoutRef = useRef(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setSubmenuKey(null);
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
    refs: [rootRef],
    onDismiss: () => setOpen(false),
  });

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
    const buttonRect = targetEl.getBoundingClientRect();
    const submenuWidthPx = 176;
    const rightSpace = window.innerWidth - buttonRect.right;
    const leftSpace = buttonRect.left;
    setSubmenuSide(rightSpace >= submenuWidthPx || rightSpace >= leftSpace ? 'right' : 'left');
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

  return (
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

      {open ? (
        <div
          className="absolute right-0 top-10 z-20 min-w-[10rem] rounded-md bg-white shadow-md"
          role="menu"
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
                onClick={(event) => {
                  if (item.disabled) return;
                  const hasSubmenu = Array.isArray(item.submenuItems) && item.submenuItems.length > 0;
                  if (hasSubmenu) {
                    openSubmenuForItem(item.key, event.currentTarget);
                    return;
                  }
                  setSubmenuKey(null);
                  item.onSelect?.();
                  setOpen(false);
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
              {submenuKey === item.key && Array.isArray(item.submenuItems) && item.submenuItems.length > 0 ? (
                <div
                  className={[
                    'absolute top-0 z-30 min-w-[11rem] rounded-md bg-white shadow-md',
                    submenuSide === 'left' ? 'right-full mr-1' : 'left-full ml-1',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="menu"
                  onMouseEnter={clearScheduledSubmenuClose}
                  onMouseLeave={() => scheduleSubmenuClose(item.key)}
                >
                  <div
                    className={[
                      'absolute top-0 h-full w-1 bg-transparent',
                      submenuSide === 'left' ? '-right-1' : '-left-1',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={clearScheduledSubmenuClose}
                    onMouseLeave={() => scheduleSubmenuClose(item.key)}
                    aria-hidden
                  />
                  <div
                    className="relative"
                    role="none"
                    onMouseEnter={clearScheduledSubmenuClose}
                    onMouseLeave={() => scheduleSubmenuClose(item.key)}
                  >
                  {item.submenuItems.map((subItem, subIndex) => (
                    <button
                      key={subItem.key}
                      type="button"
                      role="menuitem"
                      disabled={Boolean(subItem.disabled)}
                      onClick={() => {
                        if (subItem.disabled) return;
                        subItem.onSelect?.();
                        setSubmenuKey(null);
                        setOpen(false);
                      }}
                      className={[
                        'group/item flex w-full items-center border-b border-gray-200 px-3 py-3 text-left text-xs font-medium uppercase transition-colors',
                        subIndex === 0 ? 'rounded-t-md' : '',
                        subIndex === item.submenuItems.length - 1 ? 'border-b-0' : '',
                        subIndex === item.submenuItems.length - 1 ? 'rounded-b-md' : '',
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
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
