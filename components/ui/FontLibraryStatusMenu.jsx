import React, { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeLibraryText } from '../../utils/fontLibraryUtils';
import {
  addLibraryEntryToLibrary,
  requestCreateLibraryFromEntry,
} from '../../utils/libraryEntryActions';
import { useDismissibleLayer } from './useDismissibleLayer';

export function FontLibraryStatusMenu({
  libraries = [],
  libraryEntry = null,
  onMoveToLibrary,
  onCreateLibrary,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const entryId = String(libraryEntry?.id || '');
  const entrySource = String(libraryEntry?.source || '').trim();
  const entryLabel = normalizeLibraryText(libraryEntry?.label || '').toLowerCase();
  const candidateIds = Array.isArray(libraryEntry?.candidateIds)
    ? libraryEntry.candidateIds.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const candidateLabels = Array.isArray(libraryEntry?.candidateLabels)
    ? libraryEntry.candidateLabels
        .map((value) => normalizeLibraryText(value || '').toLowerCase())
        .filter(Boolean)
    : [];
  const availableLibraries = Array.isArray(libraries) ? libraries : [];
  const attachedLibraryIds = useMemo(() => {
    if (!entryId && !entryLabel && candidateIds.length === 0 && candidateLabels.length === 0) return new Set();
    return new Set(
      availableLibraries
        .filter(
          (lib) =>
            Array.isArray(lib?.fonts) &&
            lib.fonts.some((f) => {
              const fontId = String(f?.id || '').trim();
              if (entryId && fontId === entryId) return true;
              if (candidateIds.includes(fontId)) return true;
              const fontSource = String(f?.source || '').trim();
              const fontLabel = normalizeLibraryText(f?.label || '').toLowerCase();
              if (
                candidateLabels.length > 0 &&
                entrySource &&
                fontSource === entrySource &&
                candidateLabels.includes(fontLabel)
              ) {
                return true;
              }
              return Boolean(
                entryLabel &&
                  entrySource &&
                  fontSource === entrySource &&
                  fontLabel === entryLabel,
              );
            }),
        )
        .map((lib) => lib.id),
    );
  }, [availableLibraries, candidateIds, candidateLabels, entryId, entryLabel, entrySource]);

  useDismissibleLayer({
    open,
    refs: [rootRef],
    onDismiss: () => setOpen(false),
  });

  if (!libraryEntry?.label) return null;

  const inLibrary = attachedLibraryIds.size > 0;
  const attachedLibraries = availableLibraries.filter((lib) => attachedLibraryIds.has(lib.id));
  const primaryLibraryName = attachedLibraries[0]?.name || '';
  const buttonLabel = inLibrary
    ? `${primaryLibraryName}${attachedLibraries.length > 1 ? ` +${attachedLibraries.length - 1}` : ''}`
    : 'Не в библиотеке';

  return (
    <div ref={rootRef} className="relative flex h-full shrink-0 items-center pr-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-8 max-w-[11rem] items-center gap-1 px-1 text-[11px] uppercase font-semibold leading-none transition-colors ${
          open ? 'text-accent' : 'text-gray-800 hover:text-accent'
        }`}
      >
        <span className="truncate">{buttonLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 shrink-0" aria-hidden>
          <path d="M5 7h10l-5 6-5-6z" />
        </svg>
      </button>
      {open ? (
        <div className="absolute bottom-full right-0 z-40 mb-1 min-w-[14rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg" role="menu">
          {availableLibraries.length > 0 ? (
            <>
              {availableLibraries.map((library, index) => {
                const isAdded = attachedLibraryIds.has(library.id);
                return (
                  <button
                    key={library.id}
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      await addLibraryEntryToLibrary({
                        libraryId: library.id,
                        libraryEntry,
                        onAddFontToLibrary: onMoveToLibrary,
                      });
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase transition-colors ${
                      isAdded
                        ? 'bg-accent text-white'
                        : 'text-gray-900 hover:bg-accent hover:text-white'
                    } ${index > 0 ? 'border-t border-gray-200' : ''}`}
                  >
                    <span className="truncate">{library.name}</span>
                    {isAdded ? (
                      <span className="ml-2 shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] uppercase text-gray-900">
                        здесь
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </>
          ) : (
            <div className="px-3 py-2 text-xs font-semibold uppercase text-gray-400">Библиотек нет</div>
          )}
          <div className={`${availableLibraries.length > 0 ? 'border-t border-gray-200' : ''} p-1`}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                requestCreateLibraryFromEntry({
                  libraryEntry,
                  onRequestCreateLibrary: onCreateLibrary,
                });
              }}
              className="relative flex w-full items-center justify-center rounded-md px-2 py-2 text-xs font-semibold uppercase text-gray-900 transition-colors hover:bg-gray-100"
            >
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M12 4.5v15m7.5-7.5h-15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="truncate text-center">Создать новую</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
