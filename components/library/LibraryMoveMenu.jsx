import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlusIcon } from '../ui/CommonIcons';
import CatalogSessionAddSpinner from '../ui/CatalogSessionAddSpinner';
import { Tooltip } from '../ui/Tooltip';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { useLibraryAuth } from '../../contexts/LibraryAuthContext';

const LIBRARY_MOVE_DELAY_MS = 1400;

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
      <path
        d="M5 5L15 15M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Кнопка «Переместить» + выпадающий список библиотек (тулбар выделения). */
export function LibraryMoveMenu({
  disabled = false,
  hasSelection = false,
  busy = false,
  libraries = [],
  currentLibraryId = null,
  onMoveToLibrary,
  onCreateLibrary,
}) {
  const { assertCanCreateNewLibrary, isAuthenticated } = useLibraryAuth();
  const [open, setOpen] = useState(false);
  const [pendingTargetLibraryId, setPendingTargetLibraryId] = useState(null);
  const [progressActive, setProgressActive] = useState(false);
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const rootRef = useRef(null);
  const moveTimeoutRef = useRef(null);
  const availableLibraries = useMemo(
    () => libraries.filter((library) => library.id !== currentLibraryId),
    [currentLibraryId, libraries],
  );
  const pendingTargetLibrary = useMemo(
    () => libraries.find((library) => library.id === pendingTargetLibraryId) || null,
    [libraries, pendingTargetLibraryId],
  );
  const clearPendingMove = useCallback(() => {
    if (moveTimeoutRef.current != null) {
      clearTimeout(moveTimeoutRef.current);
      moveTimeoutRef.current = null;
    }
    setPendingTargetLibraryId(null);
    setProgressActive(false);
  }, []);

  useDismissibleLayer({
    open,
    refs: [rootRef],
    onDismiss: () => setOpen(false),
  });

  useEffect(() => {
    if (busy) {
      setOpen(false);
    }
  }, [busy]);

  useEffect(() => {
    if (!pendingTargetLibraryId) return undefined;
    const frameId = requestAnimationFrame(() => {
      setProgressActive(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, [pendingTargetLibraryId]);

  useEffect(() => {
    if (disabled || !hasSelection) {
      setOpen(false);
      clearPendingMove();
    }
  }, [clearPendingMove, disabled, hasSelection]);

  useEffect(() => () => clearPendingMove(), [clearPendingMove]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setViewportW(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStartPendingMove = useCallback(
    (targetLibraryId) => {
      if (disabled || busy || !hasSelection) return;
      if (!targetLibraryId || targetLibraryId === currentLibraryId) return;
      setOpen(false);
      setPendingTargetLibraryId(targetLibraryId);
      setProgressActive(false);
      moveTimeoutRef.current = window.setTimeout(async () => {
        moveTimeoutRef.current = null;
        try {
          await onMoveToLibrary?.(targetLibraryId);
        } finally {
          setPendingTargetLibraryId(null);
          setProgressActive(false);
        }
      }, LIBRARY_MOVE_DELAY_MS);
    },
    [busy, currentLibraryId, disabled, hasSelection, onMoveToLibrary],
  );

  const handleCancelPendingMove = useCallback(() => {
    clearPendingMove();
  }, [clearPendingMove]);
  const isMoveDisabled = disabled || busy || !hasSelection;
  const hideToolbarLabel = viewportW < 1024;
  const moveMenuWidthClass = hideToolbarLabel ? 'w-[5.5rem]' : 'w-[11.6rem]';

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex h-8 ${moveMenuWidthClass} items-stretch ${
        pendingTargetLibrary
          ? ''
          : `${open ? 'overflow-visible' : 'overflow-hidden'} rounded-sm border ${
              isMoveDisabled ? 'border-gray-50' : 'border-gray-200'
            }`
      }`}
    >
      {pendingTargetLibrary ? (
        <div className={`relative h-8 ${moveMenuWidthClass} overflow-hidden rounded-sm border border-gray-200 bg-gray-50`}>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 origin-left bg-accent transition-transform ease-linear"
            style={{
              width: '100%',
              transform: progressActive ? 'scaleX(1)' : 'scaleX(0)',
              transitionDuration: `${LIBRARY_MOVE_DELAY_MS}ms`,
            }}
            aria-hidden
          />
          <div className="relative flex h-full items-center justify-center px-2">
            <span className="absolute left-2 right-9 truncate text-left text-[10px] font-semibold uppercase tracking-wide text-white">
              {pendingTargetLibrary.name}
            </span>
            <Tooltip content={`Отменить перенос в «${pendingTargetLibrary.name}»`}>
              <button
                type="button"
                onClick={handleCancelPendingMove}
                className="relative flex h-6 w-6 items-center justify-center rounded-full text-accent transition-colors hover:text-accent"
                aria-label={`Отменить перенос в библиотеку ${pendingTargetLibrary.name}`}
              >
                <CatalogSessionAddSpinner className="h-6 w-6 text-accent" />
                <CloseIcon className="absolute h-3 w-3 text-white" />
              </button>
            </Tooltip>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={isMoveDisabled}
            onClick={() => setOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Переместить выделенные шрифты"
            className={`inline-flex h-8 min-w-0 flex-1 items-center rounded-l-sm bg-white text-xs uppercase font-semibold leading-none text-gray-800 transition-colors hover:bg-white disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-400 ${
              hideToolbarLabel ? 'justify-center px-3' : 'gap-2 px-4'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                d="M23 15.9999H3.41406L6.70703 12.707C7.09756 12.3164 7.09756 11.6834 6.70703 11.2929C6.31651 10.9024 5.68349 10.9024 5.29297 11.2929L0.292969 16.2929L0.224609 16.3691C-0.0957412 16.7618 -0.0731474 17.3408 0.292969 17.707L5.29297 22.707C5.68349 23.0975 6.31651 23.0975 6.70703 22.707C7.09756 22.3164 7.09756 21.6834 6.70703 21.2929L3.41406 17.9999L23 17.9999C23.5523 17.9999 24 17.5522 24 16.9999C24 16.4476 23.5523 15.9999 23 15.9999Z"
                fill="currentColor"
              />
              <path
                d="M1 5.99992H20.5859L17.293 2.70696C16.9024 2.31643 16.9024 1.68342 17.293 1.29289C17.6835 0.902369 18.3165 0.902369 18.707 1.29289L23.707 6.29289L23.7754 6.36907C24.0957 6.76184 24.0731 7.34084 23.707 7.70696L18.707 12.707C18.3165 13.0975 17.6835 13.0975 17.293 12.707C16.9024 12.3164 16.9024 11.6834 17.293 11.2929L20.5859 7.99992H1C0.447716 7.99992 2.64288e-07 7.55221 0 6.99992C-6.58593e-09 6.44764 0.447716 5.99992 1 5.99992Z"
                fill="currentColor"
              />
            </svg>
            {!hideToolbarLabel ? (
              <span className={busy ? 'truncate' : 'whitespace-nowrap'}>
                {busy ? 'Перемещение...' : 'Переместить'}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            disabled={isMoveDisabled}
            onClick={() => setOpen((value) => !value)}
            aria-label="Открыть список библиотек для переноса"
            aria-haspopup="menu"
            aria-expanded={open}
            className={`inline-flex h-8 w-9 shrink-0 items-center justify-center rounded-r-sm border-l border-gray-200 bg-white text-gray-800 transition-colors hover:bg-white disabled:cursor-default disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 ${
              open ? 'bg-white' : ''
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden>
              <path d="M5 7h10l-5 6-5-6z" />
            </svg>
          </button>
        </>
      )}
      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 min-w-[14rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg" role="menu">
          {libraries.length > 0 ? (
            <div className="max-h-64 overflow-y-auto">
              {libraries.map((library, index) => {
                const isCurrent = library.id === currentLibraryId;
                const itemDisabled = busy || !hasSelection || isCurrent;
                return (
                  <button
                    key={library.id}
                    type="button"
                    role="menuitem"
                    disabled={itemDisabled}
                    onClick={() => {
                      if (itemDisabled) return;
                      handleStartPendingMove(library.id);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase transition-colors ${
                      isCurrent
                        ? 'bg-accent text-white'
                        : 'text-gray-900 hover:bg-accent hover:text-white disabled:hover:bg-white disabled:hover:text-gray-900'
                    } ${index > 0 ? 'border-t border-gray-200' : ''} disabled:cursor-default`}
                  >
                    <span className="truncate">{library.name}</span>
                    {isCurrent ? (
                      <span className="ml-2 shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] uppercase text-gray-900">
                        здесь
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-3 text-center">
              <div className="text-xs font-semibold uppercase text-gray-900">Переносить пока некуда</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400">
                Создайте еще одну библиотеку
              </div>
            </div>
          )}
          {availableLibraries.length === 0 ? (
            <div className="border-t border-gray-200 px-3 py-3 text-center">
              <div className="text-xs font-semibold uppercase text-gray-900">Переносить пока некуда</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400">
                Создайте еще одну библиотеку
              </div>
            </div>
          ) : null}
          <div className={`${libraries.length > 0 ? 'border-t border-gray-200' : ''} p-1`}>
            <button
              type="button"
              role="menuitem"
              disabled={busy || !hasSelection}
              onClick={() => {
                if (busy || !hasSelection) return;
                setOpen(false);
                if (!assertCanCreateNewLibrary()) return;
                onCreateLibrary?.();
              }}
              className={`relative flex w-full items-center justify-center rounded-md px-2 py-2 text-xs font-semibold uppercase transition-colors disabled:cursor-default disabled:opacity-50 ${
                availableLibraries.length === 0
                  ? 'bg-accent text-white hover:bg-accent-hover'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                <PlusIcon className="h-4 w-4 shrink-0" />
              </span>
              <span className="truncate text-center">Добавить библиотеку</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
