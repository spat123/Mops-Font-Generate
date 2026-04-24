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
  const rootRef = useRef(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

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
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Закрыть меню' : triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {open ? <CloseIcon /> : <DotsIcon />}
      </IconCircleButton>

      {open ? (
        <div
          className="absolute right-0 top-10 z-20 min-w-[10rem] overflow-hidden rounded-md bg-white shadow-md"
          role="menu"
        >
          {items.map((item, index) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={Boolean(item.disabled)}
              onClick={() => {
                if (item.disabled) return;
                item.onSelect?.();
                setOpen(false);
              }}
              className={[
                'flex w-full items-center border-b border-gray-200 px-3 py-3 text-left text-xs font-medium uppercase transition-colors',
                index === items.length - 1 ? 'border-b-0' : '',
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
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
