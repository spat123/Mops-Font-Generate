import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { normalizeLibraryText } from '../../utils/fontLibraryUtils';
import {
  addLibraryEntryToLibrary,
  requestCreateLibraryFromEntry,
} from '../../utils/libraryEntryActions';
import { useDismissibleLayer } from './useDismissibleLayer';
import { useLibraryAuth } from '../../contexts/LibraryAuthContext';
import { Tooltip } from './Tooltip';
import { SelectChevronIcon } from './SelectChevronIcon';
import { getLibraryCreateActionHint, getLibraryCreateMenuLabel } from '../../utils/libraryCreateLabels';
import type { SavedLibraryFontEntry, SavedLibraryFontEntryInput } from '../../types/savedLibrary';
import type { SavedLibraryRecord } from '../../types/editorFonts';

const MENU_Z_INDEX_CLASS = 'z-[300]';

type LibraryMenuItem = Pick<SavedLibraryRecord, 'id' | 'name'> & {
  fonts?: SavedLibraryFontEntry[];
};

type MenuPosition = {
  right: number;
  bottom: number;
};

export type FontLibraryStatusMenuProps = {
  libraries?: LibraryMenuItem[];
  libraryEntry?: SavedLibraryFontEntryInput | null;
  onMoveToLibrary: (libraryId: string, libraryEntry: SavedLibraryFontEntry) => boolean | Promise<boolean>;
  onCreateLibrary: (entries: SavedLibraryFontEntry[]) => void;
};

export function FontLibraryStatusMenu({
  libraries = [],
  libraryEntry = null,
  onMoveToLibrary,
  onCreateLibrary,
}: FontLibraryStatusMenuProps) {
  const { assertCanCreateNewLibrary, isAuthenticated, requestSignIn, canCreateNewLibrary, openPlans } =
    useLibraryAuth();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
  const hasLibraries = availableLibraries.length > 0;
  const createMenuLabel = getLibraryCreateMenuLabel(hasLibraries);
  const createActionHint = getLibraryCreateActionHint(hasLibraries, {
    proLocked: isAuthenticated && !canCreateNewLibrary,
  });
  const attachedLibraryIds = useMemo(() => {
    if (!entryId && !entryLabel && candidateIds.length === 0 && candidateLabels.length === 0) return new Set<string>();
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
                entryLabel && entrySource && fontSource === entrySource && fontLabel === entryLabel,
              );
            }),
        )
        .map((lib) => lib.id),
    );
  }, [availableLibraries, candidateIds, candidateLabels, entryId, entryLabel, entrySource]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return undefined;
    }
    const sync = () => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuPos({
        right: Math.max(8, window.innerWidth - rect.right),
        bottom: Math.max(8, window.innerHeight - rect.top + 4),
      });
    };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [open]);

  useDismissibleLayer({
    open,
    refs: [rootRef, menuRef],
    onDismiss: () => setOpen(false),
  });

  if (!libraryEntry?.label) return null;
  if (!isAuthenticated) return null;

  const inLibrary = attachedLibraryIds.size > 0;
  const attachedLibraries = availableLibraries.filter((lib) => attachedLibraryIds.has(lib.id));
  const primaryLibraryName = attachedLibraries[0]?.name || '';
  const buttonLabel = inLibrary
    ? `${primaryLibraryName}${attachedLibraries.length > 1 ? ` +${attachedLibraries.length - 1}` : ''}`
    : 'Не в библиотеке';

  const menuNode =
    open && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className={`fixed min-w-[14rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg ${MENU_Z_INDEX_CLASS}`}
            style={{ right: menuPos.right, bottom: menuPos.bottom }}
            role="menu"
          >
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
                        if (!libraryEntry) return;
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
              <Tooltip as="div" className="block w-full" content={createActionHint} openDelayMs={150}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={isAuthenticated && !canCreateNewLibrary}
                  onClick={() => {
                    setOpen(false);
                    if (!isAuthenticated) {
                      requestSignIn();
                      return;
                    }
                    if (!canCreateNewLibrary) {
                      openPlans?.();
                      return;
                    }
                    if (!assertCanCreateNewLibrary() || !libraryEntry) return;
                    requestCreateLibraryFromEntry({
                      libraryEntry,
                      onRequestCreateLibrary: onCreateLibrary,
                    });
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
      <div ref={rootRef} className="relative flex h-full shrink-0 items-center pr-3">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={`inline-flex h-8 max-w-[11rem] items-center gap-1 px-1 text-xs uppercase font-semibold leading-none transition-colors ${
            open ? 'text-accent' : 'text-gray-800 hover:text-accent'
          }`}
        >
          <span className="truncate">{buttonLabel}</span>
          <SelectChevronIcon className="h-3 w-3" open={open} />
        </button>
      </div>
      {menuNode}
    </>
  );
}
