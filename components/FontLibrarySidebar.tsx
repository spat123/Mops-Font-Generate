import { useCallback, useMemo, useState } from 'react';
import { CardActionsMenu } from './ui/CardActionsMenu';
import { PlusIcon, TrashIcon, ShareIcon } from './ui/CommonIcons';
import { Tooltip } from './ui/Tooltip';
import { IconCircleButton } from './ui/IconCircleButton';
import {
  countRecentlyAddedLibraryFonts,
  getLibrarySourceLabel,
  isLibraryFontRecentlyAdded,
} from '../utils/fontLibraryUtils';
import { readLibraryFontDragData } from '../utils/libraryDragData';
import { EditAssetIcon } from './ui/EditAssetIcon';
import { downloudIconUrl, editIconUrl, updateIconUrl } from './ui/editIconUrls';
import { downloadLibraryAsZip } from '../utils/libraryArchiveDownload';
import { getLibraryCreateActionHint } from '../utils/libraryCreateLabels';
import { addLibraryEntryToLibrary } from '../utils/libraryEntryActions';
import { useLibraryAuth } from '../contexts/LibraryAuthContext';
import { AppButton } from './ui/AppButton';
import { getBillingCopy } from '../utils/billingCopy';

/** Род. после «до N …»: до 1 библиотеки, до 3 библиотек, до 21 библиотеки. */
function librariesWordAfterDo(n) {
  const num = Math.floor(Number(n)) || 0;
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'библиотек';
  if (mod10 === 1) return 'библиотеки';
  return 'библиотек';
}

export default function FontLibrarySidebar({
  libraries = [],
  activeLibraryId = null,
  onOpenLibrary,
  onDeleteLibrary,
  onReorderLibraries,
  onAddFontToLibrary,
  onRequestOpenCreateLibrary,
  onRequestOpenEditLibrary,
  onShareLibrary,
}) {
  const {
    assertCanCreateNewLibrary,
    isAuthenticated,
    requestSignIn,
    authLoading,
    canCreateNewLibrary,
    libraryLimitReached,
    openPlans,
    isPro,
    planName,
    librariesLimit,
  } = useLibraryAuth();
  const planBadgeTooltip = useMemo(() => {
    if (isPro) return 'Тариф Pro — расширенные возможности.';
    if (typeof librariesLimit === 'number' && librariesLimit > 0) {
      return `Доступно до ${librariesLimit} ${librariesWordAfterDo(librariesLimit)}`;
    }
    return 'Доступно несколько библиотек';
  }, [isPro, librariesLimit]);

  /** От 4 библиотек — скролл только списка, блок «Добавить» закреплён снизу панели. */
  const pinLibraryAddToBottom = libraries.length >= 4;

  const [draggedLibraryId, setDraggedLibraryId] = useState(null);
  const [dragOverLibraryId, setDragOverLibraryId] = useState(null);
  const [dropTargetLibraryId, setDropTargetLibraryId] = useState(null);

  const clearLibraryDragState = useCallback(() => {
    setDropTargetLibraryId(null);
    setDraggedLibraryId(null);
    setDragOverLibraryId(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    if (!assertCanCreateNewLibrary()) return;
    onRequestOpenCreateLibrary?.();
  }, [assertCanCreateNewLibrary, onRequestOpenCreateLibrary]);

  const openEditDialog = useCallback(
    (library) => {
      onRequestOpenEditLibrary?.(library);
    },
    [onRequestOpenEditLibrary],
  );

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

  const addLibraryCreateHint = getLibraryCreateActionHint(libraries.length > 0);

  const addLibraryPlusBlock = useMemo(
    () =>
      canCreateNewLibrary ? (
        <div className="flex justify-center">
          <Tooltip content={addLibraryCreateHint}>
            <IconCircleButton
              variant="accent"
              size="md"
              onClick={openCreateDialog}
              aria-label={addLibraryCreateHint}
            >
              <PlusIcon />
            </IconCircleButton>
          </Tooltip>
        </div>
      ) : null,
    [addLibraryCreateHint, canCreateNewLibrary, openCreateDialog],
  );

  /** Всегда внизу левой колонки (отдельно от логики «плюса» под списком). */
  const libraryLimitReachedPanel = useMemo(
    () =>
      libraryLimitReached ? (
        <div className="rounded-xl bg-gray-50 p-3" role="region" aria-label="Лимит библиотек">
          <div className="flex gap-2">
            <div className="group shrink-0" aria-hidden>
              <EditAssetIcon
                src={updateIconUrl}
                className="h-4 w-4 text-accent transition-colors group-hover:text-white"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase leading-snug tracking-wide text-gray-900">
                Лимит библиотек достигнут
              </p>
              <p className="mt-1.5 text-[10px] font-normal text-gray-500">
                {getBillingCopy().upgradeHintReceive}
              </p>
            </div>
          </div>
          <AppButton
            type="button"
            variant="accent"
            fullWidth
            size="sm"
            className="mt-4"
            onClick={() => openPlans?.()}
          >
            Улучшить
          </AppButton>
        </div>
      ) : null,
    [libraryLimitReached, openPlans],
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {libraries.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-gray-900">Библиотеки</span>
              <Tooltip content={planBadgeTooltip} openDelayMs={200} side="bottom">
                <span
                  className={`inline-flex shrink-0 cursor-default rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    isPro ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {isPro ? 'Pro' : planName || 'Free'}
                </span>
              </Tooltip>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div
                className={
                  pinLibraryAddToBottom
                    ? 'min-h-0 flex-1 overflow-y-auto'
                    : 'min-h-0 w-full shrink-0'
                }
              >
                <div className="space-y-3">
                {libraries.map((library) => {
                  const isActive = activeLibraryId === library.id;
                  const fontCount = Array.isArray(library.fonts) ? library.fonts.length : 0;
                  const recentAddedCount = countRecentlyAddedLibraryFonts(library.fonts);
                  const previewFonts = fontCount > 4 ? library.fonts.slice(0, 1) : library.fonts;
                  const remainingFontCount = fontCount > 4 ? fontCount - 1 : 0;
                  const showRecentBadgeInHeader =
                    recentAddedCount > 0 && remainingFontCount === 0 && fontCount > 1;
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
                        if (
                          event.relatedTarget instanceof Node &&
                          !event.currentTarget.contains(event.relatedTarget)
                        ) {
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
                            className={`flex shrink-0 items-center gap-1.5 text-sm font-semibold uppercase ${
                              isActive ? 'text-white/90' : 'text-gray-500'
                            }`}
                          >
                            <span>{fontCount} ШТ.</span>
                            {showRecentBadgeInHeader ? (
                              <Tooltip content="Добавлены за последние 24 ч" openDelayMs={150}>
                                <span
                                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none tabular-nums ${
                                    isActive ? 'bg-white text-accent' : 'bg-accent text-white'
                                  }`}
                                  aria-label={`Новых за сутки: ${recentAddedCount}`}
                                >
                                  +{recentAddedCount}
                                </span>
                              </Tooltip>
                            ) : null}
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
                            label: 'Поделиться',
                            icon: <ShareIcon />,
                            onSelect: () => {
                              onShareLibrary?.(library.id);
                            },
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
                              className={`inline-flex max-w-full items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium ${
                                isActive ? 'bg-white text-gray-900' : 'bg-gray-50 text-gray-700'
                              }`}
                              title={`${font.label} · ${getLibrarySourceLabel(font.source)}`}
                            >
                              <span className="truncate">{font.label}</span>
                              {isLibraryFontRecentlyAdded(font) ? (
                                <span
                                  className="inline-flex h-2 w-2 shrink-0 rounded-full bg-accent"
                                  aria-label="Добавлен за последние 24 ч"
                                />
                              ) : null}
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
                          {recentAddedCount > 0 && remainingFontCount === 0 && fontCount === 1 ? (
                            <Tooltip content="Добавлены за последние 24 ч" openDelayMs={150}>
                              <span
                                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ring-2 ${
                                  isActive
                                    ? 'bg-white text-accent ring-white/80'
                                    : 'bg-accent text-white ring-white/90'
                                }`}
                                aria-label={`Новых за сутки: ${recentAddedCount}`}
                              >
                                +{recentAddedCount}
                              </span>
                            </Tooltip>
                          ) : null}
                          {recentAddedCount > 0 && remainingFontCount > 0 ? (
                            <Tooltip content="Добавлены за последние 24 ч" openDelayMs={150}>
                              <span
                                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ring-2 ${
                                  isActive
                                    ? 'bg-white text-accent ring-white/80'
                                    : 'bg-accent text-white ring-white/90'
                                }`}
                                aria-label={`Новых за сутки: ${recentAddedCount}`}
                              >
                                +{recentAddedCount}
                              </span>
                            </Tooltip>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                </div>
                {!pinLibraryAddToBottom && addLibraryPlusBlock ? (
                  <div className="mt-4 shrink-0">{addLibraryPlusBlock}</div>
                ) : null}
              </div>
              {pinLibraryAddToBottom && addLibraryPlusBlock ? (
                <div className="shrink-0 bg-white">{addLibraryPlusBlock}</div>
              ) : null}
              </div>
              {libraryLimitReachedPanel ? (
                <div className="mt-3 shrink-0 bg-white">{libraryLimitReachedPanel}</div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="flex max-w-[16rem] flex-col items-center gap-4 text-center">
              {authLoading ? (
                <p className="text-xs uppercase text-gray-400">Загрузка…</p>
              ) : !isAuthenticated ? (
                <>
                  <div className="w-full max-w-[14rem]">
                    <AppButton type="button" fullWidth onClick={() => requestSignIn()}>
                      Войти
                    </AppButton>
                  </div>
                  <p className="text-xs font-normal leading-5 text-gray-500">
                    Войдите, чтобы создавать  <br /> библиотеки.
                  </p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={openCreateDialog}
                    className="inline-flex flex-col items-center justify-center gap-3 text-center text-sm font-semibold uppercase text-gray-900 transition-colors hover:text-accent"
                  >
                    <IconCircleButton as="span" variant="accent" size="lg">
                      <PlusIcon className="h-5 w-5" />
                    </IconCircleButton>
                    <span className="leading-5">Создать библиотеку</span>
                  </button>
                  <p className="text-xs font-normal leading-5 text-gray-300 transition-colors hover:text-gray-600">
                    На данный момент у вас нет библиотек. Создайте библиотеку, чтобы собирать шрифты отдельно от каталога.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
