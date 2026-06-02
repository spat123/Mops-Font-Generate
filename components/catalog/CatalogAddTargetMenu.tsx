import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { SavedLibraryRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';
import { countSameCatalogFontInLibrary } from '../../utils/fontLibraryUtils';

export type CatalogAddTargetAppearance = 'default' | 'row';

type MenuPosition = {
  top: number;
  left: number;
  ready: boolean;
};

const MENU_Z_INDEX_CLASS = 'z-[300]';

export type CatalogAddTargetMenuProps = {
  libraries?: SavedLibraryRecord[];
  libraryEntry?: SavedLibraryFontEntry | null;
  busy?: boolean;
  onAddToSession?: () => boolean | Promise<boolean>;
  onAddToLibrary?: (libraryId: string) => boolean | Promise<boolean>;
  shouldAddToSession?: (libraryId: string) => boolean;
  onCreateLibrary?: () => boolean | Promise<boolean>;
  primaryLabel?: string;
  className?: string;
  busyIndicator?: ReactNode;
  appearance?: CatalogAddTargetAppearance;
  stateKey?: string;
};
import { PlusIcon } from '../ui/CommonIcons';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { useLibraryAuth } from '../../contexts/LibraryAuthContext';
import { Tooltip } from '../ui/Tooltip';
import { getLibraryCreateActionHint, getLibraryCreateMenuLabel } from '../../utils/libraryCreateLabels';

function ChevronDownIcon({ className = 'h-3 w-3' }: { className?: string }) {
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

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
  libraryEntry = null,
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
}: CatalogAddTargetMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0, ready: false });
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const completedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { authLoading, isAuthenticated, canCreateNewLibrary, requestSignIn, assertCanCreateNewLibrary } =
    useLibraryAuth();
  const hasLibraries = libraries.length > 0;
  const createMenuLabel = getLibraryCreateMenuLabel(hasLibraries);
  const createActionHint = getLibraryCreateActionHint(hasLibraries, {
    proLocked: !canCreateNewLibrary,
  });
  const createActionHintAuthenticated = getLibraryCreateActionHint(hasLibraries, {
    proLocked: isAuthenticated && !canCreateNewLibrary,
  });
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

  const runAction = async (action?: () => boolean | Promise<boolean>) => {
    if (busy || typeof action !== 'function') return false;
    const result = await action();
    if (result !== false) {
      showCompleted();
      return true;
    }
    return false;
  };

  const runAddToLibrary = async (libraryId: string) => {
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

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition((prev) => ({ ...prev, ready: false }));
      return undefined;
    }

    const updatePosition = () => {
      const anchorEl = anchorRef.current;
      if (!anchorEl) return;
      const triggerRect = anchorEl.getBoundingClientRect();
      const menuEl = menuRef.current;
      const menuWidth = Math.max(208, menuEl?.offsetWidth || 208);
      const menuHeight = Math.max(40, menuEl?.offsetHeight || 180);
      const viewportW = window.innerWidth || 0;
      const viewportH = window.innerHeight || 0;
      const edgeGap = 8;
      const offsetY = 8;
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
  }, [open, libraries.length]);

  useDismissibleLayer({
    open,
    refs: [rootRef, menuRef],
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
    if (!isAuthenticated) {
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
      return null;
    }
    return (
      <Tooltip content={createActionHint} openDelayMs={150}>
        <button
          type="button"
          disabled={busy || !canCreateNewLibrary}
          aria-busy={busy}
          aria-label={createActionHint}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
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

  const menuNode =
    open && menuPosition.ready && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className={`fixed min-w-[13rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ${MENU_Z_INDEX_CLASS}`}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              visibility: menuPosition.ready ? 'visible' : 'hidden',
            }}
            role="menu"
          >
            <div className={libraries.length > 8 ? 'max-h-64 overflow-y-auto overscroll-contain' : ''}>
              {libraries.map((library, index) => {
                const matchCount = libraryEntry
                  ? countSameCatalogFontInLibrary(libraryEntry, library.fonts || [])
                  : 0;
                return (
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
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold uppercase transition-colors ${
                      selectedLibraryId === library.id
                        ? 'bg-accent text-white'
                        : 'text-gray-900 hover:bg-accent hover:text-white'
                    } ${index < libraries.length - 1 ? 'border-b border-gray-200' : ''}`}
                  >
                    <span className="min-w-0 truncate">{library.name}</span>
                    {matchCount > 0 ? (
                      <span
                        className={`shrink-0 tabular-nums text-[11px] font-bold ${
                          selectedLibraryId === library.id ? 'text-white/90' : 'text-gray-500'
                        }`}
                      >
                        {matchCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-gray-200 p-1">
              <Tooltip
                as="div"
                className="block w-full"
                content={createActionHintAuthenticated}
                openDelayMs={150}
              >
                <button
                  type="button"
                  disabled={isAuthenticated && !canCreateNewLibrary}
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
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
                  <span className="min-w-0 flex-1 truncate text-center">{createMenuLabel}</span>
                  {isAuthenticated && !canCreateNewLibrary ? (
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                      Pro
                    </span>
                  ) : null}
                </button>
              </Tooltip>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
    <div ref={rootRef} className={`relative inline-flex max-w-full items-center ${className}`.trim()}>
      <button
        ref={anchorRef}
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

    </div>
    {menuNode}
    </>
  );
}
