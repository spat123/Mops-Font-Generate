import React, { useEffect, useRef, useState } from 'react';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { useLibraryAuth } from '../../contexts/LibraryAuthContext';
import { Tooltip } from '../ui/Tooltip';

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

function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M4.5 10.5L8 14L15.5 6.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CatalogAddTargetMenu({
  libraries = [],
  busy = false,
  onAddToSession,
  onAddToLibrary,
  shouldAddToSession,
  onCreateLibrary,
  primaryLabel = 'В библиотеку',
  className = '',
  busyIndicator = null,
  appearance = 'default',
  stateKey = '',
}) {
  const [open, setOpen] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState(null);
  const [completed, setCompleted] = useState(false);
  const rootRef = useRef(null);
  const completedTimerRef = useRef(null);
  const { authLoading, isAuthenticated, canCreateNewLibrary, requestSignIn, assertCanCreateNewLibrary } =
    useLibraryAuth();
  const hasLibraries = libraries.length > 0;
  const isRowAppearance = appearance === 'row';
  const singleButtonClassName = isRowAppearance
    ? `inline-flex max-w-full items-center gap-2 rounded-md border-0 bg-transparent py-1 text-xs uppercase font-semibold leading-none text-black transition-colors hover:text-black group-hover:!text-white group-hover:hover:!text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default disabled:opacity-100 ${className}`.trim()
    : `inline-flex max-w-full items-center gap-1.5 rounded-md border-0 bg-transparent py-1 text-xs uppercase font-semibold leading-none text-gray-800 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-default disabled:opacity-100 ${className}`.trim();
  const selectorButtonClassName = isRowAppearance
    ? `inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md border-0 bg-transparent py-0 text-xs uppercase font-semibold leading-none text-black transition-colors hover:text-black group-hover:!text-white group-hover:hover:!text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
        open ? 'text-black group-hover:!text-white' : ''
      }`
    : `inline-flex h-5 min-w-0 items-center gap-1 rounded-md border-0 bg-transparent py-0 text-xs uppercase font-semibold leading-none text-gray-800 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        open ? 'text-accent' : ''
      }`;
  const addButtonClassName = isRowAppearance
    ? 'ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-black transition-colors hover:text-black group-hover:!text-white group-hover:hover:!text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default disabled:opacity-100'
    : 'ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-gray-800 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-default disabled:opacity-100';
  const standaloneAddButtonClassName = isRowAppearance
    ? `inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-black transition-colors hover:text-black group-hover:!text-white group-hover:hover:!text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default disabled:opacity-100 ${className}`.trim()
    : `inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-gray-800 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-default disabled:opacity-100 ${className}`.trim();
  const plusIconClassName = isRowAppearance ? 'h-5 w-5 shrink-0' : 'h-4 w-4 shrink-0';
  const chevronClassName = isRowAppearance ? 'h-4.5 w-4.5 shrink-0' : 'h-4 w-4 shrink-0';

  const showCompleted = () => {
    if (completedTimerRef.current) {
      clearTimeout(completedTimerRef.current);
    }
    setCompleted(true);
    completedTimerRef.current = setTimeout(() => {
      setCompleted(false);
      completedTimerRef.current = null;
    }, 1200);
  };

  const runAction = async (action) => {
    if (busy || typeof action !== 'function') return false;
    const result = await action();
    if (result !== false) {
      showCompleted();
      return true;
    }
    return false;
  };

  const runAddToLibrary = async (libraryId) => {
    if (!libraryId) return false;
    if (typeof onAddToSession === 'function' && shouldAddToSession?.(libraryId) !== false) {
      const addedToSession = await onAddToSession();
      if (addedToSession === false) return false;
    }
    if (typeof onAddToLibrary !== 'function') return false;
    return onAddToLibrary(libraryId);
  };

  useEffect(() => {
    if (libraries.length === 0) {
      setSelectedLibraryId(null);
      return;
    }
    if (selectedLibraryId && libraries.some((library) => library.id === selectedLibraryId)) return;
    setSelectedLibraryId(libraries[0]?.id || null);
  }, [libraries, selectedLibraryId]);

  useDismissibleLayer({
    open,
    refs: [rootRef],
    onDismiss: () => setOpen(false),
  });

  useEffect(() => {
    return () => {
      if (completedTimerRef.current) {
        clearTimeout(completedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (completedTimerRef.current) {
      clearTimeout(completedTimerRef.current);
      completedTimerRef.current = null;
    }
    setCompleted(false);
    setOpen(false);
  }, [stateKey]);

  if (!hasLibraries) {
    if (authLoading) {
      return (
        <span
          className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center text-gray-400 ${className}`.trim()}
          aria-hidden
        >
          <span className="h-3 w-3 animate-pulse rounded-full bg-gray-300" />
        </span>
      );
    }
    if (!isAuthenticated) {
      return null;
    }
    return (
      <Tooltip content={!canCreateNewLibrary ? 'Доступно в Pro' : 'Создать библиотеку'} openDelayMs={150}>
        <button
          type="button"
          disabled={busy || !canCreateNewLibrary}
          aria-busy={busy}
          aria-label="Создать библиотеку"
          onClick={() => {
            if (!assertCanCreateNewLibrary()) return;
            void runAction(onCreateLibrary);
          }}
          className={standaloneAddButtonClassName}
        >
          {busy ? busyIndicator : completed ? <CheckIcon className={plusIconClassName} /> : <PlusIcon className={plusIconClassName} />}
        </button>
      </Tooltip>
    );
  }

  const selectedLibrary = libraries.find((library) => library.id === selectedLibraryId) || null;
  const currentLabel = selectedLibrary?.name || primaryLabel;

  return (
    <div ref={rootRef} className={`relative inline-flex max-w-full items-center ${className}`.trim()}>
      <button
        type="button"
        aria-label="Выбрать, куда добавить шрифт"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={selectorButtonClassName}
      >
        <span className="select-none truncate">{currentLabel}</span>
        <ChevronDownIcon className={chevronClassName} />
      </button>

      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        aria-label={selectedLibrary ? `Добавить в библиотеку ${selectedLibrary.name}` : 'Добавить в библиотеку'}
        onClick={() => {
          if (!selectedLibrary) {
            setOpen(true);
            return;
          }
          void runAction(() => runAddToLibrary(selectedLibrary.id));
        }}
        className={addButtonClassName}
      >
        {busy ? busyIndicator : completed ? <CheckIcon className={plusIconClassName} /> : <PlusIcon className={plusIconClassName} />}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-[13rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
          role="menu"
        >
          <div
            className={
              libraries.length > 8 ? 'max-h-64 overflow-y-auto overscroll-contain' : ''
            }
          >
            {libraries.map((library, index) => (
              <button
                key={library.id}
                type="button"
                role="menuitemradio"
                aria-checked={selectedLibraryId === library.id}
                onClick={() => {
                  setOpen(false);
                  setSelectedLibraryId(library.id);
                  if (!busy) {
                    void runAction(() => runAddToLibrary(library.id));
                  }
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold uppercase transition-colors ${
                  selectedLibraryId === library.id
                    ? 'bg-accent text-white'
                    : 'text-gray-900 hover:bg-accent hover:text-white'
                } ${index < libraries.length - 1 ? 'border-b border-gray-200' : ''}`}
              >
                <span className="truncate">{library.name}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-200 p-1">
            <Tooltip
              as="div"
              className="block w-full"
              content={isAuthenticated && !canCreateNewLibrary ? 'Доступно в Pro' : 'Создать библиотеку'}
              openDelayMs={150}
            >
              <button
                type="button"
                disabled={isAuthenticated && !canCreateNewLibrary}
                onClick={() => {
                  setOpen(false);
                  if (!isAuthenticated) {
                    requestSignIn();
                    return;
                  }
                  if (!canCreateNewLibrary) {
                    void assertCanCreateNewLibrary();
                    return;
                  }
                  onCreateLibrary?.();
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-semibold uppercase transition-colors ${
                  isAuthenticated && !canCreateNewLibrary
                    ? 'cursor-not-allowed text-gray-400'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                >
                  <path
                    d="M12 4.5v15m7.5-7.5h-15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="min-w-0 flex-1 truncate text-center">Создать</span>
                {isAuthenticated && !canCreateNewLibrary ? (
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                    Pro
                  </span>
                ) : null}
              </button>
            </Tooltip>
          </div>
        </div>
      ) : null}
    </div>
  );
}
