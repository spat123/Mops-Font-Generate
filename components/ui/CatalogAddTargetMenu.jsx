import React, { useEffect, useRef, useState } from 'react';
import { PlusIcon } from './CommonIcons';

function ChevronDownIcon({ className = 'h-3 w-3' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M5 7h10l-5 6-5-6z" />
    </svg>
  );
}

export function CatalogAddTargetMenu({
  libraries = [],
  busy = false,
  onAddToSession,
  onAddToLibrary,
  onCreateLibrary,
  primaryLabel = 'В сессию',
  className = '',
  busyIndicator = null,
}) {
  const [open, setOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState({ type: 'session', libraryId: null });
  const rootRef = useRef(null);
  const hasLibraries = libraries.length > 0;

  useEffect(() => {
    if (selectedTarget.type !== 'library') return;
    if (libraries.some((library) => library.id === selectedTarget.libraryId)) return;
    setSelectedTarget({ type: 'session', libraryId: null });
  }, [libraries, selectedTarget]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!hasLibraries) {
    return (
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        aria-label="Добавить в сессию"
        onClick={onAddToSession}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-md border-0 bg-transparent py-1 text-[11px] uppercase font-semibold leading-none text-gray-500 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-default disabled:opacity-100 ${className}`.trim()}
      >
        <span className="select-none truncate">{primaryLabel}</span>
        {busy ? busyIndicator : <PlusIcon className="h-4 w-4 shrink-0" />}
      </button>
    );
  }

  const selectedLibrary =
    selectedTarget.type === 'library'
      ? libraries.find((library) => library.id === selectedTarget.libraryId) || null
      : null;
  const currentLabel = selectedLibrary?.name || primaryLabel;

  return (
    <div ref={rootRef} className={`relative inline-flex max-w-full items-center ${className}`.trim()}>
      <button
        type="button"
        aria-label="Выбрать, куда добавить шрифт"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-5 min-w-0 items-center gap-1 rounded-md border-0 bg-transparent py-0 text-[11px] uppercase font-semibold leading-none text-gray-500 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
          open ? 'text-accent' : ''
        }`}
      >
        <span className="select-none truncate">{currentLabel}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0" />
      </button>

      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        aria-label={selectedLibrary ? `Добавить в библиотеку ${selectedLibrary.name}` : 'Добавить в сессию'}
        onClick={() => {
          if (selectedLibrary) {
            onAddToLibrary?.(selectedLibrary.id);
            return;
          }
          onAddToSession?.();
        }}
        className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-gray-500 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-default disabled:opacity-100"
      >
        {busy ? busyIndicator : <PlusIcon className="h-4 w-4 shrink-0" />}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-[13rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
          role="menu"
        >
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={selectedTarget.type === 'session'}
              onClick={() => {
                setSelectedTarget({ type: 'session', libraryId: null });
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold uppercase transition-colors ${
                selectedTarget.type === 'session'
                  ? 'bg-accent text-white'
                  : 'text-gray-900 hover:bg-accent hover:text-white'
              }`}
            >
              <span className="truncate">{primaryLabel}</span>
            </button>
            {libraries.map((library) => (
              <button
                key={library.id}
                type="button"
                role="menuitemradio"
                aria-checked={selectedTarget.type === 'library' && selectedTarget.libraryId === library.id}
                onClick={() => {
                  setOpen(false);
                  setSelectedTarget({ type: 'library', libraryId: library.id });
                }}
                className={`flex w-full items-center border-t border-gray-200 px-3 py-2 text-left text-xs font-semibold uppercase transition-colors ${
                  selectedTarget.type === 'library' && selectedTarget.libraryId === library.id
                    ? 'bg-accent text-white'
                    : 'text-gray-900 hover:bg-accent hover:text-white'
                }`}
              >
                <span className="truncate">{library.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 p-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreateLibrary?.();
              }}
              className="relative flex w-full items-center justify-center rounded-md px-2 py-2 text-xs font-semibold uppercase text-gray-900 transition-colors hover:bg-gray-100"
            >
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                <PlusIcon className="h-4 w-4 shrink-0" />
              </span>
              <span className="truncate text-center">Создать новую</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
