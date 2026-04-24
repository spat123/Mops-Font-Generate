import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SelectableChip } from './ui/SelectableChip';
import { CardActionsMenu } from './ui/CardActionsMenu';
import { PlusIcon, TrashIcon, SearchIcon, ShareIcon } from './ui/CommonIcons';
import { NATIVE_SELECT_FIELD_INTERACTIVE } from './ui/nativeSelectFieldClasses';
import { SearchClearButton } from './ui/SearchClearButton';
import { Tooltip } from './ui/Tooltip';
import { IconCircleButton } from './ui/IconCircleButton';
import { matchesSearch } from '../utils/searchMatching';
import { readGoogleFontCatalogCache } from '../utils/googleFontCatalogCache';
import {
  getLibrarySourceLabel,
  mapFontsourceCatalogItemsToLibraryEntries,
  mapGoogleCatalogItemsToLibraryEntries,
  mapSessionFontsToLibraryEntries,
  mergeLibraryEntries,
  normalizeLibraryText,
} from '../utils/fontLibraryUtils';
import { readLibraryFontDragData } from '../utils/libraryDragData';
import { EditAssetIcon } from './ui/EditAssetIcon';
import { downloudIconUrl, editIconUrl } from './ui/editIconUrls';
import { downloadLibraryAsZip } from '../utils/libraryArchiveDownload';
import { addLibraryEntryToLibrary } from '../utils/libraryEntryActions';

const LIBRARY_NAME_MAX_LENGTH = 32;
const SEARCH_RESULTS_LIMIT = 24;
const FONT_LIBRARY_DRAFT_STORAGE_KEY = 'fontLibrarySidebarDraft';

function readCachedGoogleCatalog() {
  return mapGoogleCatalogItemsToLibraryEntries(readGoogleFontCatalogCache());
}

function createEmptyDraft() {
  return {
    mode: 'create',
    editingLibraryId: null,
    libraryName: '',
    searchQuery: '',
    selectedFonts: [],
  };
}

function normalizeDraftFonts(fonts) {
  return (Array.isArray(fonts) ? fonts : []).filter(
    (item) => item && typeof item.label === 'string',
  );
}

function createDraftWithFonts(selectedFonts = []) {
  return {
    ...createEmptyDraft(),
    selectedFonts: normalizeDraftFonts(selectedFonts),
  };
}

function createEditDraft(library) {
  return {
    mode: 'edit',
    editingLibraryId: library?.id || null,
    libraryName: library?.name || '',
    searchQuery: '',
    selectedFonts: normalizeDraftFonts(library?.fonts),
  };
}

function sanitizeDraft(draft) {
  if (!draft || typeof draft !== 'object') return createEmptyDraft();
  return {
    mode: draft.mode === 'edit' ? 'edit' : 'create',
    editingLibraryId: typeof draft.editingLibraryId === 'string' ? draft.editingLibraryId : null,
    libraryName: String(draft.libraryName || ''),
    searchQuery: String(draft.searchQuery || ''),
    selectedFonts: normalizeDraftFonts(draft.selectedFonts),
  };
}

function readStoredDraft() {
  if (typeof window === 'undefined') return createEmptyDraft();
  try {
    const raw = window.localStorage.getItem(FONT_LIBRARY_DRAFT_STORAGE_KEY);
    return raw ? sanitizeDraft(JSON.parse(raw)) : createEmptyDraft();
  } catch {
    return createEmptyDraft();
  }
}

export default function FontLibrarySidebar({
  sessionFonts = [],
  libraries = [],
  activeLibraryId = null,
  onOpenLibrary,
  onCreateLibrary,
  onUpdateLibrary,
  onDeleteLibrary,
  onReorderLibraries,
  createLibrarySeedRequest = null,
  onCreateLibrarySeedHandled,
  onAddFontToLibrary,
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState(() => readStoredDraft());
  const [catalogEntries, setCatalogEntries] = useState(() => readCachedGoogleCatalog());
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [draggedLibraryId, setDraggedLibraryId] = useState(null);
  const [dragOverLibraryId, setDragOverLibraryId] = useState(null);
  const [dropTargetLibraryId, setDropTargetLibraryId] = useState(null);
  const nameInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const { mode, editingLibraryId, libraryName, searchQuery, selectedFonts } = draft;

  const patchDraft = useCallback((patch) => {
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

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const clearLibraryDragState = useCallback(() => {
    setDropTargetLibraryId(null);
    setDraggedLibraryId(null);
    setDragOverLibraryId(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    setDraft((prev) => (prev.mode === 'create' ? prev : createEmptyDraft()));
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((library) => {
    setDraft(createEditDraft(library));
    setIsDialogOpen(true);
  }, []);

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
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDialog, isDialogOpen]);

  useEffect(() => {
    if (catalogEntries.length > 0 || isCatalogLoading) return undefined;

    let cancelled = false;
    setIsCatalogLoading(true);

    (async () => {
      try {
        const [googleRes, fontsourceRes] = await Promise.allSettled([
          fetch('/api/google-fonts-catalog'),
          fetch('/api/fontsource-catalog'),
        ]);

        const sessionEntries = mapSessionFontsToLibraryEntries(sessionFonts);
        let googleItems = readCachedGoogleCatalog();
        let fontsourceItems = [];

        if (googleItems.length === 0 && googleRes.status === 'fulfilled' && googleRes.value.ok) {
          const data = await googleRes.value.json();
          googleItems = mapGoogleCatalogItemsToLibraryEntries(Array.isArray(data.items) ? data.items : []);
        }

        if (fontsourceRes.status === 'fulfilled' && fontsourceRes.value.ok) {
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
  }, [isCatalogLoading, catalogEntries.length, sessionFonts]);

  useEffect(() => {
    if (mode !== 'edit' || !editingLibraryId) return;
    if (libraries.some((item) => item.id === editingLibraryId)) return;
    resetDraft();
    setIsDialogOpen(false);
  }, [editingLibraryId, libraries, mode, resetDraft]);

  useEffect(() => {
    if (!createLibrarySeedRequest?.requestId) return;

    setDraft(createDraftWithFonts(createLibrarySeedRequest.selectedFonts));
    setIsDialogOpen(true);
    onCreateLibrarySeedHandled?.(createLibrarySeedRequest.requestId);
  }, [createLibrarySeedRequest, onCreateLibrarySeedHandled]);

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

  const addFontToDraft = useCallback((entry) => {
    setDraft((prev) => {
      if (prev.selectedFonts.some((item) => item.id === entry.id)) return prev;
      return {
        ...prev,
        selectedFonts: [...prev.selectedFonts, entry],
      };
    });
    searchInputRef.current?.focus();
  }, []);

  const removeFontFromDraft = useCallback((entryId) => {
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
  }, [
    editingLibraryId,
    libraryName,
    mode,
    onCreateLibrary,
    onOpenLibrary,
    onUpdateLibrary,
    resetDraft,
    selectedFonts,
  ]);

  const isSubmitDisabled = normalizeLibraryText(libraryName).length === 0;
  const hasSearchInput = searchQuery.trim().length > 0;
  const isEditMode = mode === 'edit' && editingLibraryId;
  const nameFieldClass = `box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-14 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${NATIVE_SELECT_FIELD_INTERACTIVE} focus:border-black/[0.14] focus:outline-none sm:pl-3`;
  const searchFieldClass = `box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-10 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 ${NATIVE_SELECT_FIELD_INTERACTIVE} focus:border-black/[0.14] focus:outline-none sm:pl-3`;

  const dialogTitle = isEditMode ? 'Редактировать библиотеку' : 'Добавить библиотеку шрифтов';
  const submitLabel = isEditMode ? 'Сохранить' : 'Создать';

  const handleLibraryDrop = useCallback(
    (event, libraryId) => {
      event.preventDefault();
      const draggedFontEntry = readLibraryFontDragData(event.dataTransfer);
      if (draggedFontEntry) {
        void addLibraryEntryToLibrary({
          libraryId,
          libraryEntry: draggedFontEntry,
          onAddFontToLibrary,
        });
        clearLibraryDragState();
        return;
      }
      const sourceId = event.dataTransfer.getData('text/plain') || draggedLibraryId;
      if (sourceId && sourceId !== libraryId) {
        onReorderLibraries?.(sourceId, libraryId);
      }
      clearLibraryDragState();
    },
    [clearLibraryDragState, draggedLibraryId, onAddFontToLibrary, onReorderLibraries],
  );

  const createDialog =
    isDialogOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={dialogTitle}
            onClick={closeDialog}
          >
            <div
              className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold uppercase text-gray-900">{dialogTitle}</h3>
                <IconCircleButton
                  variant="gray100Close"
                  onClick={closeDialog}
                  aria-label="Закрыть окно"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                    className="h-6 w-6"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </IconCircleButton>
              </div>

              <div className="mt-4">
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
              </div>

              <div className="mt-4">
                <div className="relative">
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
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-800">
                      <SearchIcon className="h-5 w-5" />
                    </span>
                  )}
                </div>
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
                      title="Убрать шрифт"
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
                            title={getLibrarySourceLabel(entry.source)}
                          >
                            <span className="truncate">{entry.label}</span>
                          </SelectableChip>
                        ))}
                      </div>
                    </>
                  ) : availableEntries.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {isCatalogLoading ? 'Загружаю список шрифтов...' : 'Список шрифтов пока пуст.'}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">По запросу ничего не найдено.</p>
                  )}
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="w-full rounded-md min-h-8 border border-gray-200 px-4 py-2 text-sm font-semibold uppercase text-gray-700 transition-colors hover:bg-black/[0.9] hover:border-black/[0.9] hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled}
                  className="w-full rounded-md min-h-8 border border-accent bg-accent px-4 py-2 text-sm font-semibold uppercase text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {libraries.length > 0 ? (
          <>
            <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-900">Библиотеки</div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-3">
                {libraries.map((library) => {
                  const isActive = activeLibraryId === library.id;
                  const fontCount = Array.isArray(library.fonts) ? library.fonts.length : 0;
                  const previewFonts = fontCount > 4 ? library.fonts.slice(0, 1) : library.fonts;
                  const remainingFontCount = fontCount > 4 ? fontCount - 1 : 0;
                  return (
                    <div
                      key={library.id}
                      className={`group relative rounded-xl border p-3 transition-colors ${
                        isActive ? 'border-accent bg-accent' : 'border-gray-200 bg-white'
                      } ${draggedLibraryId === library.id ? 'opacity-55' : ''} ${
                        dragOverLibraryId === library.id && draggedLibraryId !== library.id
                          ? 'ring-2 ring-inset ring-accent'
                          : ''
                      } ${
                        dropTargetLibraryId === library.id ? 'ring-2 ring-inset ring-black' : ''
                      } cursor-pointer`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        clearLibraryDragState();
                        onOpenLibrary?.(library.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          clearLibraryDragState();
                          onOpenLibrary?.(library.id);
                        }
                      }}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', library.id);
                        setDraggedLibraryId(library.id);
                      }}
                      onDragOver={(event) => {
                        const draggedFontEntry = readLibraryFontDragData(event.dataTransfer);
                        if (draggedFontEntry) {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'copy';
                          if (dropTargetLibraryId !== library.id) {
                            setDropTargetLibraryId(library.id);
                          }
                          if (dragOverLibraryId !== null) {
                            setDragOverLibraryId(null);
                          }
                          return;
                        }
                        event.preventDefault();
                        if (dragOverLibraryId !== library.id) {
                          setDragOverLibraryId(library.id);
                        }
                        if (dropTargetLibraryId !== null) {
                          setDropTargetLibraryId(null);
                        }
                      }}
                      onDrop={(event) => handleLibraryDrop(event, library.id)}
                      onDragEnd={() => {
                        clearLibraryDragState();
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setDropTargetLibraryId((prev) => (prev === library.id ? null : prev));
                          setDragOverLibraryId((prev) => (prev === library.id ? null : prev));
                        }
                      }}
                    >
                      <div className="min-w-0 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <h3
                            className={`truncate text-sm font-semibold uppercase ${
                              isActive ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {library.name}
                          </h3>
                          <span
                            className={`shrink-0 text-sm font-semibold uppercase ${
                              isActive ? 'text-white/90' : 'text-gray-500'
                            }`}
                          >
                            {fontCount} ШТ.
                          </span>
                        </div>
                      </div>
                      <CardActionsMenu
                        className="right-1.5 top-1.5"
                        triggerLabel={`Действия для библиотеки ${library.name}`}
                        triggerVariant={isActive ? 'gray100Menu' : 'gray50Menu'}
                        items={[
                          {
                            key: 'download-all',
                            label: 'Скачать всё',
                            icon: <EditAssetIcon src={downloudIconUrl} className="h-4 w-4" />,
                            onSelect: () => void downloadLibraryAsZip(library),
                          },
                          {
                            key: 'share',
                            label: 'Переместить',
                            disabled: true,
                            icon: <ShareIcon />,
                            onSelect: () => {},
                          },
                          {
                            key: 'edit',
                            label: 'Редактировать',
                            icon: <EditAssetIcon src={editIconUrl} className="h-4 w-4" />,
                            onSelect: () => openEditDialog(library),
                          },
                          {
                            key: 'delete',
                            label: 'Удалить',
                            tone: 'danger',
                            icon: <TrashIcon />,
                            onSelect: () => onDeleteLibrary?.(library.id),
                          },
                        ]}
                      />

                      {fontCount > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {previewFonts.map((font) => (
                            <span
                              key={font.id}
                              className={`inline-flex max-w-full items-center rounded-sm px-2.5 py-1 text-xs font-medium ${
                                isActive ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'
                              }`}
                              title={`${font.label} · ${getLibrarySourceLabel(font.source)}`}
                            >
                              <span className="truncate">{font.label}</span>
                            </span>
                          ))}
                          {remainingFontCount > 0 ? (
                            <span
                              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                                isActive ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-700'
                              }`}
                              title={`Еще ${remainingFontCount} ${remainingFontCount === 1 ? 'шрифт' : 'шрифтов'}`}
                            >
                              +{remainingFontCount}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="sticky bottom-0 flex justify-center bg-white/95 pt-4 pb-1 backdrop-blur-sm">
                <Tooltip content="Добавить библиотеку">
                  <IconCircleButton
                    variant="accent"
                    size="md"
                    onClick={openCreateDialog}
                    aria-label="Добавить библиотеку"
                  >
                    <PlusIcon />
                  </IconCircleButton>
                </Tooltip>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="flex max-w-[16rem] flex-col items-center gap-4 text-center">
              <button
                type="button"
                onClick={openCreateDialog}
                className="inline-flex flex-col items-center justify-center gap-3 text-center text-sm font-semibold uppercase text-gray-900 transition-colors hover:text-accent"
              >
                <IconCircleButton as="span" variant="accent" size="lg">
                  <PlusIcon className="h-5 w-5" />
                </IconCircleButton>
                <span className="leading-5">Добавить библиотеку</span>
              </button>
              <p className="text-xs font-normal leading-5 text-gray-300 transition-colors hover:text-gray-600">
                На данный момент у вас нет библиотек. Создайте библиотеку, чтобы собирать шрифты отдельно от каталога.
              </p>
            </div>
          </div>
        )}
      </div>

      {createDialog}
    </>
  );
}
