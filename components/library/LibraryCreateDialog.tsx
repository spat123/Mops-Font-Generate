import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SavedLibraryRecord, SessionFontRecord } from '../../types/editorFonts';
import type { LibraryCreateDialogRequest } from '../../types/libraryCreateDialog';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';
import { SelectableChip } from '../ui/SelectableChip';
import { SearchIcon } from '../ui/CommonIcons';
import { NATIVE_SELECT_FIELD_INTERACTIVE } from '../ui/nativeSelectFieldClasses';
import { SearchClearButton } from '../ui/SearchClearButton';
import { PopupDialogHeader } from '../ui/PopupDialogHeader';
import { AppButton } from '../ui/AppButton';
import { ensureCatalogCachesLoaded } from '../../utils/ensureCatalogCachesLoaded';
import { normalizeLibraryText } from '../../utils/fontLibraryUtils';
import {
  buildLibraryPickerCatalogIndex,
  normalizeLibraryEntriesForPicker,
  readPreferredCatalogLibraryEntries,
  resolvePreferredLibraryPickerEntry,
  searchLibraryPickerCatalog,
  searchSessionLocalFontsForPicker,
  type LibraryPickerCatalogIndex,
} from '../../utils/libraryPickerCatalogSearch';
import {
  createEmptyLibraryDraft,
  createLibraryDraftWithFonts,
  createLibraryEditDraft,
  type LibraryCreateDraft,
} from '../../utils/libraryCreateDraft';

const LIBRARY_NAME_MAX_LENGTH = 32;

export type LibraryCreateDialogProps = {
  sessionFonts?: SessionFontRecord[];
  openRequest?: LibraryCreateDialogRequest | null;
  onOpenRequestHandled?: (requestId: string) => void;
  openCreateLibrarySignal?: number;
  onCreateLibrary?: (draft: { name: string; fonts: SavedLibraryFontEntry[] }) => SavedLibraryRecord | null;
  onUpdateLibrary?: (libraryId: string, draft: Partial<SavedLibraryRecord>) => void;
  onOpenLibrary?: (libraryId: string) => void;
};

export function LibraryCreateDialog({
  sessionFonts = [],
  openRequest = null,
  onOpenRequestHandled,
  openCreateLibrarySignal = 0,
  onCreateLibrary,
  onUpdateLibrary,
  onOpenLibrary,
}: LibraryCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LibraryCreateDraft>(() => createEmptyLibraryDraft());
  const [catalogIndex, setCatalogIndex] = useState<LibraryPickerCatalogIndex | null>(() =>
    buildLibraryPickerCatalogIndex(),
  );
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const catalogFetchStartedRef = useRef(false);
  const appliedRequestIdRef = useRef<string | null>(null);
  const lastOpenCreateLibrarySignalRef = useRef(openCreateLibrarySignal);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { mode, editingLibraryId, libraryName, searchQuery, selectedFonts } = draft;

  const patchDraft = useCallback((patch: Partial<LibraryCreateDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(createEmptyLibraryDraft());
  }, []);

  const closeDialog = useCallback(
    (requestId?: string | null) => {
      setOpen(false);
      appliedRequestIdRef.current = null;
      catalogFetchStartedRef.current = false;
      resetDraft();
      const id = requestId || openRequest?.requestId;
      if (id && typeof onOpenRequestHandled === 'function') {
        onOpenRequestHandled(id);
      }
    },
    [onOpenRequestHandled, openRequest?.requestId, resetDraft],
  );

  const openWithDraft = useCallback((nextDraft: LibraryCreateDraft) => {
    setDraft(nextDraft);
    setOpen(true);
  }, []);

  useEffect(() => {
    const requestId = openRequest?.requestId;
    if (!requestId) {
      appliedRequestIdRef.current = null;
      return;
    }
    if (appliedRequestIdRef.current === requestId) return;
    appliedRequestIdRef.current = requestId;

    if (openRequest.mode === 'edit' && openRequest.library) {
      openWithDraft(createLibraryEditDraft(openRequest.library));
      return;
    }
    openWithDraft(createLibraryDraftWithFonts(openRequest.selectedFonts || []));
  }, [openRequest, openWithDraft]);

  useEffect(() => {
    if (typeof openCreateLibrarySignal !== 'number' || openCreateLibrarySignal < 1) return;
    if (openCreateLibrarySignal === lastOpenCreateLibrarySignalRef.current) return;
    lastOpenCreateLibrarySignalRef.current = openCreateLibrarySignal;
    appliedRequestIdRef.current = `signal:${openCreateLibrarySignal}`;
    openWithDraft(createEmptyLibraryDraft());
  }, [openCreateLibrarySignal, openWithDraft]);

  useEffect(() => {
    if (!open) return undefined;
    const timeoutId = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDialog, open]);

  useEffect(() => {
    if (!open) {
      catalogFetchStartedRef.current = false;
      return undefined;
    }
    if (catalogFetchStartedRef.current) return undefined;

    catalogFetchStartedRef.current = true;
    let cancelled = false;
    setIsCatalogLoading(true);
    setCatalogError('');

    (async () => {
      try {
        await ensureCatalogCachesLoaded({
          needsGoogle: true,
          needsFontsource: true,
          preferCompleteFontsource: true,
        });
        if (!cancelled) setCatalogIndex(buildLibraryPickerCatalogIndex());
      } catch {
        if (!cancelled) setCatalogError('Не удалось загрузить каталог шрифтов');
      } finally {
        if (!cancelled) setIsCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const pickerNormalizeOptions = useMemo(
    () => ({ dedupeFamilies: !(mode === 'edit' && editingLibraryId) }),
    [editingLibraryId, mode],
  );

  /** Предвыбранные и уже добавленные записи — Fontsource, если есть в каталоге. */
  useEffect(() => {
    if (!open || !catalogIndex) return;
    setDraft((prev) => {
      const normalized = normalizeLibraryEntriesForPicker(
        prev.selectedFonts,
        catalogIndex,
        pickerNormalizeOptions,
      );
      if (
        normalized.length === prev.selectedFonts.length &&
        normalized.every((item, i) => item.id === prev.selectedFonts[i]?.id)
      ) {
        return prev;
      }
      return { ...prev, selectedFonts: normalized };
    });
  }, [catalogIndex, open, pickerNormalizeOptions]);

  const searchQueryTrimmed = searchQuery.trim();

  const filteredEntries = useMemo(() => {
    if (!searchQueryTrimmed) return [];
    const catalogHits = searchLibraryPickerCatalog({
      searchQueryTrimmed,
      selectedEntries: selectedFonts,
      index: catalogIndex,
    });
    const localHits = searchSessionLocalFontsForPicker(sessionFonts, searchQueryTrimmed, selectedFonts);
    const seen = new Set(catalogHits.map((item) => item.id));
    const merged = [...catalogHits];
    for (const item of localHits) {
      if (!seen.has(item.id)) merged.push(item);
    }
    return merged;
  }, [catalogIndex, searchQueryTrimmed, selectedFonts, sessionFonts]);

  const addFontToDraft = useCallback(
    (entry: SavedLibraryFontEntry) => {
      const preferred = resolvePreferredLibraryPickerEntry(entry, catalogIndex) || entry;
      setDraft((prev) => {
        const normalized = normalizeLibraryEntriesForPicker([...prev.selectedFonts, preferred], catalogIndex);
        return {
          ...prev,
          selectedFonts: normalized,
          searchQuery: '',
        };
      });
      searchInputRef.current?.focus();
    },
    [catalogIndex],
  );

  const removeFontFromDraft = useCallback((entryId: string) => {
    setDraft((prev) => ({
      ...prev,
      selectedFonts: prev.selectedFonts.filter((item) => item.id !== entryId),
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    const normalized = normalizeLibraryText(libraryName);
    if (!normalized) return;

    const fontsForSave = normalizeLibraryEntriesForPicker(
      selectedFonts,
      catalogIndex,
      pickerNormalizeOptions,
    );

    if (mode === 'edit' && editingLibraryId) {
      onUpdateLibrary?.(editingLibraryId, {
        name: normalized,
        fonts: fontsForSave,
      });
      onOpenLibrary?.(editingLibraryId);
    } else {
      const created = onCreateLibrary?.({
        name: normalized,
        fonts: fontsForSave,
      });
      if (created?.id) {
        onOpenLibrary?.(created.id);
      }
    }

    closeDialog(openRequest?.requestId);
  }, [
    catalogIndex,
    pickerNormalizeOptions,
    closeDialog,
    editingLibraryId,
    libraryName,
    mode,
    onCreateLibrary,
    onOpenLibrary,
    onUpdateLibrary,
    openRequest?.requestId,
    selectedFonts,
  ]);

  const isSubmitDisabled = normalizeLibraryText(libraryName).length === 0;
  const hasSearchInput = searchQueryTrimmed.length > 0;
  const isEditMode = mode === 'edit' && editingLibraryId;
  const nameFieldClass = `box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-14 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${NATIVE_SELECT_FIELD_INTERACTIVE} focus:border-black/[0.14] focus:outline-none sm:pl-3`;
  const searchFieldClass = `box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${NATIVE_SELECT_FIELD_INTERACTIVE} focus:border-black/[0.14] focus:outline-none sm:pl-3`;

  const dialogTitle = isEditMode ? 'Редактировать библиотеку' : 'Создать библиотеку шрифтов';
  const submitLabel = isEditMode ? 'Сохранить' : 'Создать';

  const catalogReady = Boolean(catalogIndex) && readPreferredCatalogLibraryEntries(catalogIndex).length > 0;

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={dialogTitle}
      onClick={() => closeDialog()}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-none border border-gray-200 bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <PopupDialogHeader title={dialogTitle} onClose={() => closeDialog()} closeAriaLabel="Закрыть окно" />

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
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-semibold tabular-nums text-gray-400">
              {libraryName.length}/{LIBRARY_NAME_MAX_LENGTH}
            </span>
          </div>

          <div className="relative mt-3">
            <input
              id="font-library-search"
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => patchDraft({ searchQuery: event.target.value })}
              placeholder="Имя, категория…"
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

          <div className="mt-3 max-h-56 overflow-y-auto">
            {catalogError ? <p className="text-sm text-red-600">{catalogError}</p> : null}
            {!hasSearchInput ? (
              <p className="text-sm text-gray-500">
                {isCatalogLoading
                  ? 'Загружаю каталог…'
                  : 'Начните вводить название — как в поиске каталога.'}
              </p>
            ) : filteredEntries.length > 0 ? (
              <>
                {isCatalogLoading ? (
                  <p className="mb-2 text-xs text-gray-400">Обновляю каталог…</p>
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
            ) : isCatalogLoading ? (
              <p className="text-sm text-gray-500">Ищу в каталоге…</p>
            ) : catalogReady ? (
              <p className="text-sm text-gray-500">По запросу ничего не найдено.</p>
            ) : (
              <p className="text-sm text-gray-500">Каталог ещё не загружен. Подождите или обновите страницу.</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-stretch gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <AppButton type="button" fullWidth onClick={() => closeDialog()}>
            Отмена
          </AppButton>
          <AppButton type="button" variant="accent" fullWidth onClick={handleSubmit} disabled={isSubmitDisabled}>
            {submitLabel}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
