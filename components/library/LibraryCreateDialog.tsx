import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { SelectableChip } from '../ui/SelectableChip';
import { SearchIcon } from '../ui/CommonIcons';
import { NATIVE_SELECT_FIELD_INTERACTIVE } from '../ui/nativeSelectFieldClasses';
import { SearchClearButton } from '../ui/SearchClearButton';
import { matchesSearch } from '../../utils/searchMatching';
import { readGoogleFontCatalogCache } from '../../utils/googleFontCatalogCache';
import { readFontsourceCatalogCache } from '../../utils/fontsourceCatalogCache';
import {
  mapFontsourceCatalogItemsToLibraryEntries,
  mapGoogleCatalogItemsToLibraryEntries,
  mapSessionFontsToLibraryEntries,
  mergeLibraryEntries,
  normalizeLibraryText,
} from '../../utils/fontLibraryUtils';
import { PopupDialogHeader } from '../ui/PopupDialogHeader';
import { useLibraryAuth } from '../../contexts/LibraryAuthContext';
import { AppButton } from '../ui/AppButton';
import {
  createDraftWithFonts,
  createEditDraft,
  createEmptyDraft,
  FONT_LIBRARY_DRAFT_STORAGE_KEY,
  LIBRARY_NAME_MAX_LENGTH,
  readStoredLibraryCreateDraft,
  type LibraryCreateDialogDraft,
} from './libraryCreateDialogDraft';
import type { SavedLibraryRecord, SessionFontRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';

const SEARCH_RESULTS_LIMIT = 24;

function readCachedCatalogLibraryEntries() {
  return mergeLibraryEntries(
    mapGoogleCatalogItemsToLibraryEntries(readGoogleFontCatalogCache()),
    mapFontsourceCatalogItemsToLibraryEntries(readFontsourceCatalogCache()),
  );
}

export function newLibraryCreateDialogRequestId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `library-dialog:${Date.now()}`;
}

export type LibraryCreateDialogRequest = {
  requestId: string;
  mode: 'create' | 'edit' | 'seed';
  library?: SavedLibraryRecord | null;
  selectedFonts?: SavedLibraryFontEntry[];
};

export type LibraryCreateDialogProps = {
  sessionFonts?: SessionFontRecord[];
  libraries?: SavedLibraryRecord[];
  openRequest?: LibraryCreateDialogRequest | null;
  onOpenRequestHandled?: (requestId: string) => void;
  openCreateLibrarySignal?: number;
  onCreateLibrary?: (draft: { name: string; fonts: SavedLibraryFontEntry[] }) => SavedLibraryRecord | null;
  onUpdateLibrary?: (libraryId: string, draft: Partial<SavedLibraryRecord>) => void;
  onOpenLibrary?: (libraryId: string) => void;
};

export function LibraryCreateDialog({
  sessionFonts = [],
  libraries = [],
  openRequest = null,
  onOpenRequestHandled,
  openCreateLibrarySignal = 0,
  onCreateLibrary,
  onUpdateLibrary,
  onOpenLibrary,
}: LibraryCreateDialogProps) {
  const { assertCanCreateNewLibrary } = useLibraryAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState<LibraryCreateDialogDraft>(() => readStoredLibraryCreateDraft());
  const [catalogEntries, setCatalogEntries] = useState(() => readCachedCatalogLibraryEntries());
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  const catalogFetchStartedRef = useRef(false);
  const appliedOpenRequestIdRef = useRef<string | null>(null);
  const backdropCloseGuardUntilRef = useRef(0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastOpenCreateLibrarySignalRef = useRef(openCreateLibrarySignal);

  const { mode, editingLibraryId, libraryName, searchQuery, selectedFonts } = draft;

  const patchDraft = useCallback((patch: Partial<LibraryCreateDialogDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(createEmptyDraft());
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(FONT_LIBRARY_DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const clearOpenRequest = useCallback(
    (requestId = openRequest?.requestId) => {
      if (!requestId || typeof onOpenRequestHandled !== 'function') return;
      onOpenRequestHandled(requestId);
    },
    [onOpenRequestHandled, openRequest?.requestId],
  );

  const scheduleOpenDialog = useCallback(() => {
    backdropCloseGuardUntilRef.current = Date.now() + 450;
    if (typeof window === 'undefined') {
      setIsDialogOpen(true);
      return;
    }
    window.requestAnimationFrame(() => {
      setIsDialogOpen(true);
    });
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    appliedOpenRequestIdRef.current = null;
    clearOpenRequest();
  }, [clearOpenRequest]);

  const openCreateDialog = useCallback(() => {
    if (!assertCanCreateNewLibrary()) return;
    setDraft((prev) => (prev.mode === 'create' ? prev : createEmptyDraft()));
    scheduleOpenDialog();
  }, [assertCanCreateNewLibrary, scheduleOpenDialog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FONT_LIBRARY_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  useEffect(() => {
    if (!isDialogOpen) return undefined;
    const timeoutId = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDialog, isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen) {
      catalogFetchStartedRef.current = false;
      return undefined;
    }
    if (catalogEntries.length > 0 || catalogFetchStartedRef.current) return undefined;

    catalogFetchStartedRef.current = true;
    let cancelled = false;
    setIsCatalogLoading(true);
    setCatalogError('');

    void (async () => {
      try {
        const [googleRes, fontsourceRes] = await Promise.allSettled([
          fetch('/api/google-fonts-catalog'),
          fetch('/api/fontsource-catalog'),
        ]);

        const sessionEntries = mapSessionFontsToLibraryEntries(sessionFonts);
        let googleItems = mapGoogleCatalogItemsToLibraryEntries(readGoogleFontCatalogCache());
        let fontsourceItems = mapFontsourceCatalogItemsToLibraryEntries(readFontsourceCatalogCache());

        if (googleItems.length === 0 && googleRes.status === 'fulfilled' && googleRes.value.ok) {
          const data = await googleRes.value.json();
          googleItems = mapGoogleCatalogItemsToLibraryEntries(
            Array.isArray(data.items) ? data.items : [],
          );
        }

        if (
          fontsourceItems.length === 0 &&
          fontsourceRes.status === 'fulfilled' &&
          fontsourceRes.value.ok
        ) {
          const data = await fontsourceRes.value.json();
          fontsourceItems = mapFontsourceCatalogItemsToLibraryEntries(
            Array.isArray(data.items) ? data.items : [],
          );
        }

        if (!cancelled) {
          setCatalogEntries(mergeLibraryEntries(sessionEntries, googleItems, fontsourceItems));
        }
      } catch {
        if (!cancelled) {
          setCatalogError('Не удалось загрузить список шрифтов');
        }
      } finally {
        if (!cancelled) {
          setIsCatalogLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDialogOpen, catalogEntries.length, sessionFonts]);

  useEffect(() => {
    if (mode !== 'edit' || !editingLibraryId) return;
    if (libraries.some((item) => item.id === editingLibraryId)) return;
    resetDraft();
    setIsDialogOpen(false);
    appliedOpenRequestIdRef.current = null;
    clearOpenRequest();
  }, [clearOpenRequest, editingLibraryId, libraries, mode, resetDraft]);

  useEffect(() => {
    const requestId = openRequest?.requestId;
    if (!requestId) {
      appliedOpenRequestIdRef.current = null;
      return;
    }
    if (appliedOpenRequestIdRef.current === requestId) return;
    appliedOpenRequestIdRef.current = requestId;

    if (openRequest.mode === 'seed') {
      setDraft(createDraftWithFonts(openRequest.selectedFonts));
    } else if (openRequest.mode === 'edit' && openRequest.library) {
      setDraft(createEditDraft(openRequest.library));
    } else {
      setDraft(createEmptyDraft());
    }
    scheduleOpenDialog();
  }, [openRequest, scheduleOpenDialog]);

  useEffect(() => {
    if (typeof openCreateLibrarySignal !== 'number' || openCreateLibrarySignal < 1) return;
    if (openCreateLibrarySignal === lastOpenCreateLibrarySignalRef.current) return;
    lastOpenCreateLibrarySignalRef.current = openCreateLibrarySignal;
    openCreateDialog();
  }, [openCreateLibrarySignal, openCreateDialog]);

  const availableEntries = useMemo(
    () => mergeLibraryEntries(mapSessionFontsToLibraryEntries(sessionFonts), catalogEntries),
    [catalogEntries, sessionFonts],
  );

  const filteredEntries = useMemo(() => {
    const selectedIds = new Set(selectedFonts.map((item) => item.id));
    return availableEntries
      .filter((item) => !selectedIds.has(item.id))
      .filter((item) => matchesSearch(item.label, searchQuery))
      .slice(0, SEARCH_RESULTS_LIMIT);
  }, [availableEntries, searchQuery, selectedFonts]);

  const addFontToDraft = useCallback((entry: SavedLibraryFontEntry) => {
    setDraft((prev) => {
      if (prev.selectedFonts.some((item) => item.id === entry.id)) return prev;
      return {
        ...prev,
        selectedFonts: [...prev.selectedFonts, entry],
      };
    });
    searchInputRef.current?.focus();
  }, []);

  const removeFontFromDraft = useCallback((entryId: string) => {
    setDraft((prev) => ({
      ...prev,
      selectedFonts: prev.selectedFonts.filter((item) => item.id !== entryId),
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    const normalized = normalizeLibraryText(libraryName);
    if (!normalized) return;

    if (mode === 'edit' && editingLibraryId) {
      onUpdateLibrary?.(editingLibraryId, {
        name: normalized,
        fonts: selectedFonts,
      });
      onOpenLibrary?.(editingLibraryId);
    } else {
      const created = onCreateLibrary?.({
        name: normalized,
        fonts: selectedFonts,
      });
      if (created?.id) {
        onOpenLibrary?.(created.id);
      }
    }

    resetDraft();
    setIsDialogOpen(false);
    appliedOpenRequestIdRef.current = null;
    clearOpenRequest();
  }, [
    clearOpenRequest,
    editingLibraryId,
    libraryName,
    mode,
    onCreateLibrary,
    onOpenLibrary,
    onUpdateLibrary,
    resetDraft,
    selectedFonts,
  ]);

  const handleBackdropPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (Date.now() < backdropCloseGuardUntilRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [],
  );

  const handleBackdropClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (Date.now() < backdropCloseGuardUntilRef.current) return;
      closeDialog();
    },
    [closeDialog],
  );

  const isSubmitDisabled = normalizeLibraryText(libraryName).length === 0;
  const hasSearchInput = searchQuery.trim().length > 0;
  const isEditMode = mode === 'edit' && editingLibraryId;
  const nameFieldClass = `box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-14 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${NATIVE_SELECT_FIELD_INTERACTIVE} focus:border-black/[0.14] focus:outline-none sm:pl-3`;
  const searchFieldClass = `box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${NATIVE_SELECT_FIELD_INTERACTIVE} focus:border-black/[0.14] focus:outline-none sm:pl-3`;

  const dialogTitle = isEditMode ? 'Редактировать библиотеку' : 'Создать библиотеку шрифтов';
  const submitLabel = isEditMode ? 'Сохранить' : 'Создать';

  if (!isDialogOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={dialogTitle}
      onPointerDown={handleBackdropPointerDown}
      onClick={handleBackdropClick}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-none border border-gray-200 bg-white"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <PopupDialogHeader title={dialogTitle} onClose={closeDialog} closeAriaLabel="Закрыть окно" />

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="relative">
            <input
              id="font-library-name"
              ref={nameInputRef}
              type="text"
              maxLength={LIBRARY_NAME_MAX_LENGTH}
              value={libraryName}
              onChange={(event) => patchDraft({ libraryName: event.target.value })}
              placeholder="Например, Гротески"
              className={nameFieldClass}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold tabular-nums text-gray-400">
              {libraryName.length}/{LIBRARY_NAME_MAX_LENGTH}
            </span>
          </div>
          <div className="relative mt-4">
            <input
              id="font-library-search"
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => patchDraft({ searchQuery: event.target.value })}
              placeholder="Начните вводить название шрифта"
              className={searchFieldClass}
              autoComplete="off"
              spellCheck={false}
            />
            {searchQuery ? (
              <SearchClearButton
                onClick={() => patchDraft({ searchQuery: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              />
            ) : (
              <span className="pointer-events-none absolute inset-y-0 right-2 inline-flex items-center text-gray-800">
                <SearchIcon className="h-[18px] w-[18px]" />
              </span>
            )}
          </div>

          {selectedFonts.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedFonts.map((font) => (
                <SelectableChip
                  key={font.id}
                  type="button"
                  active
                  onClick={() => removeFontFromDraft(font.id)}
                  className="max-w-full"
                >
                  <span className="truncate">{font.label} ×</span>
                </SelectableChip>
              ))}
            </div>
          ) : null}

          {hasSearchInput ? (
            <div className="mt-3 max-h-48 overflow-y-auto">
              {catalogError ? (
                <p className="text-sm text-red-600">{catalogError}</p>
              ) : filteredEntries.length > 0 ? (
                <>
                  {isCatalogLoading ? (
                    <p className="mb-2 text-xs text-gray-400">Догружаю полный список шрифтов...</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {filteredEntries.map((entry) => (
                      <SelectableChip
                        key={entry.id}
                        type="button"
                        active={false}
                        onClick={() => addFontToDraft(entry)}
                      >
                        <span className="truncate">{entry.label}</span>
                      </SelectableChip>
                    ))}
                  </div>
                </>
              ) : availableEntries.length === 0 && selectedFonts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {isCatalogLoading ? 'Загружаю список шрифтов...' : 'Список шрифтов пока пуст.'}
                </p>
              ) : availableEntries.length === 0 && isCatalogLoading ? (
                <p className="text-sm text-gray-500">Догружаю полный список шрифтов...</p>
              ) : (
                <p className="text-sm text-gray-500">По запросу ничего не найдено.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-stretch gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <AppButton type="button" fullWidth onClick={closeDialog}>
            Отмена
          </AppButton>
          <AppButton
            type="button"
            variant="accent"
            fullWidth
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {submitLabel}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
