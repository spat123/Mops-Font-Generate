import React, { useMemo } from 'react';
import { buildCatalogDownloadButtonProps } from '../components/catalog/buildCatalogDownloadButtonProps';
import { SavedLibraryCatalogAddCorner } from '../components/library/SavedLibraryCatalogAddCorner';
import { OpenExternalIcon, ShareIcon, TrashIcon } from '../components/ui/CommonIcons';
import { moveAndSwapIconUrl } from '../components/ui/editIconUrls';
import { buildSavedLibraryDownloadSplitButtonProps } from '../utils/savedLibraryFontDownload';
import { isLibraryFontRecentlyAdded } from '../utils/fontLibraryUtils';
import {
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
} from '../utils/catalogDownloadActions';
import { getSessionFontCardPreviewStyle } from '../utils/sessionFontCardPreview';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';
import type {
  SavedLibraryCardViewItem,
  SavedLibraryCatalogSearchRow,
} from '../types/savedLibraryCard';

type SavedLibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

type UseSavedLibraryCardItemsParams = {
  activeSavedLibrary: SavedLibraryRecord | null;
  filteredActiveSavedLibraryFonts: SavedLibraryFontEntry[];
  catalogSearchResults: SavedLibraryCatalogSearchRow[];
  savedLibrarySearchQueryTrimmed: string;
  mainTab: string;
  fontLibraries: SavedLibraryRecord[];
  selectedSavedLibraryFontIds: Set<string>;
  buildSavedLibraryCardMetaParts: (
    font: SavedLibraryFontEntry,
    sessionFont?: SessionFontRecord | null,
  ) => string[] | undefined;
  savedLibraryCardMetaClassName: string;
  savedLibraryHideDownloadLabel: boolean;
  resolveSessionFontForLibraryEntry: (font: SavedLibraryFontEntry) => SessionFontRecord | null | undefined;
  openLibraryFontEntry: (font: SavedLibraryFontEntry) => void | Promise<void>;
  onSavedLibrarySelectionCardClick: (event: React.MouseEvent, fontId: string) => void;
  startSavedLibraryCardLongPress: (event: React.PointerEvent, fontId: string) => void;
  clearSavedLibraryLongPressTimer: () => void;
  moveSingleSavedLibraryFont: (
    font: SavedLibraryFontEntry,
    targetLibraryId: string,
  ) => void | Promise<boolean>;
  openLibraryShareDialog: (libraryId: string, options?: { onlyFontIds?: string[] }) => void;
  handleUpdateSavedLibrary: (libraryId: string, draft: Partial<SavedLibraryRecord>) => void;
  openGoogleCatalogEntryInEditorTab: (entry: Record<string, unknown>) => void;
  openFontsourceSlugInEditorTab: (slug: string, isVariable?: boolean) => void;
  addFontEntryToLibrary: (libraryId: string, libraryEntry: SavedLibraryFontEntry) => boolean;
  savedLibraryCatalogAddBusyId: string | null;
  setSavedLibraryCatalogAddBusyId: (id: string | null) => void;
  savedLibraryCatalogRecentlyAddedSet: Set<string>;
  markSavedLibraryCatalogRecentlyAdded: (id: string, ttlMs: number) => void;
};

/**
 * View-model карточек сохранённой библиотеки и результатов поиска по каталогу.
 */
export function useSavedLibraryCardItems({
  activeSavedLibrary,
  filteredActiveSavedLibraryFonts,
  catalogSearchResults,
  savedLibrarySearchQueryTrimmed,
  mainTab,
  fontLibraries,
  selectedSavedLibraryFontIds,
  buildSavedLibraryCardMetaParts,
  savedLibraryCardMetaClassName,
  savedLibraryHideDownloadLabel,
  resolveSessionFontForLibraryEntry,
  openLibraryFontEntry,
  onSavedLibrarySelectionCardClick,
  startSavedLibraryCardLongPress,
  clearSavedLibraryLongPressTimer,
  moveSingleSavedLibraryFont,
  openLibraryShareDialog,
  handleUpdateSavedLibrary,
  openGoogleCatalogEntryInEditorTab,
  openFontsourceSlugInEditorTab,
  addFontEntryToLibrary,
  savedLibraryCatalogAddBusyId,
  setSavedLibraryCatalogAddBusyId,
  savedLibraryCatalogRecentlyAddedSet,
  markSavedLibraryCatalogRecentlyAdded,
}: UseSavedLibraryCardItemsParams) {
  const activeSavedLibraryItems = useMemo((): SavedLibraryCardViewItem[] => {
    if (!activeSavedLibrary) return [];
    const now = Date.now();
    return filteredActiveSavedLibraryFonts.map((font) => {
      const sessionFont = resolveSessionFontForLibraryEntry(font);
      return {
        id: font.id,
        selected: sessionFont ? mainTab === sessionFont.id : false,
        batchSelected: selectedSavedLibraryFontIds.has(font.id),
        title: font.label,
        recentlyAdded: isLibraryFontRecentlyAdded(font, now),
        subtitleParts: buildSavedLibraryCardMetaParts(font, sessionFont),
        subtitleClassName: savedLibraryCardMetaClassName,
        previewStyle: sessionFont ? getSessionFontCardPreviewStyle(sessionFont) : undefined,
        onCardClick: (event) => {
          onSavedLibrarySelectionCardClick(event as React.MouseEvent, font.id);
          if (event?.defaultPrevented || selectedSavedLibraryFontIds.size > 0) return;
          void openLibraryFontEntry(font);
        },
        onPointerDown: (event) => startSavedLibraryCardLongPress(event, font.id),
        onPointerUp: clearSavedLibraryLongPressTimer,
        onPointerLeave: clearSavedLibraryLongPressTimer,
        onPointerCancel: clearSavedLibraryLongPressTimer,
        downloadSplitButtonProps: (() => {
          const props = buildSavedLibraryDownloadSplitButtonProps(font, sessionFont);
          if (!props) return null;
          return { ...props, hidePrimaryLabel: savedLibraryHideDownloadLabel };
        })(),
        menuItems: [
          {
            key: 'open',
            label: 'Открыть',
            icon: <OpenExternalIcon />,
            onSelect: () => {
              void openLibraryFontEntry(font);
            },
          },
          {
            key: 'move',
            label: 'Переместить',
            icon: (
              <img
                src={moveAndSwapIconUrl}
                alt=""
                aria-hidden
                className="h-4 w-4 object-contain transition-[filter] duration-150 group-hover/item:invert"
              />
            ),
            submenuItems: (() => {
              const targets = Array.isArray(fontLibraries)
                ? fontLibraries.filter((library) => library.id !== activeSavedLibrary.id)
                : [];
              if (targets.length === 0) {
                const emptyLabel = fontLibraries?.length ? 'Других библиотек нет' : 'Библиотек нет';
                return [{ key: 'move-empty', label: emptyLabel, disabled: true }];
              }
              return targets.map((library) => ({
                key: `move-${library.id}`,
                label: library.name,
                onSelect: () => {
                  void moveSingleSavedLibraryFont(font, library.id);
                },
              }));
            })(),
          },
          {
            key: 'share',
            label: 'Поделиться',
            icon: <ShareIcon />,
            onSelect: () => {
              openLibraryShareDialog(activeSavedLibrary.id, { onlyFontIds: [font.id] });
            },
          },
          {
            key: 'remove',
            label: 'Удалить',
            icon: <TrashIcon />,
            tone: 'danger',
            onSelect: () =>
              handleUpdateSavedLibrary(activeSavedLibrary.id, {
                fonts: (activeSavedLibrary.fonts || []).filter((item) => item.id !== font.id),
              }),
          },
        ],
      };
    });
  }, [
    activeSavedLibrary,
    filteredActiveSavedLibraryFonts,
    buildSavedLibraryCardMetaParts,
    clearSavedLibraryLongPressTimer,
    fontLibraries,
    handleUpdateSavedLibrary,
    mainTab,
    moveSingleSavedLibraryFont,
    onSavedLibrarySelectionCardClick,
    openLibraryFontEntry,
    openLibraryShareDialog,
    resolveSessionFontForLibraryEntry,
    savedLibraryCardMetaClassName,
    savedLibraryHideDownloadLabel,
    selectedSavedLibraryFontIds,
    startSavedLibraryCardLongPress,
  ]);

  const activeSavedLibraryCatalogItems = useMemo((): SavedLibraryCardViewItem[] => {
    if (!activeSavedLibrary) return [];
    if (!savedLibrarySearchQueryTrimmed) return [];

    const buildCorner = (
      row: SavedLibraryCatalogSearchRow,
      libraryEntry: SavedLibraryFontEntry,
      doneClassName: string,
    ) => {
      const cornerBusy = savedLibraryCatalogAddBusyId === row.id;
      const cornerDone = row.alreadyInLibrary || savedLibraryCatalogRecentlyAddedSet.has(row.id);
      return (
        <SavedLibraryCatalogAddCorner
          alreadyInLibrary={row.alreadyInLibrary}
          busy={cornerBusy}
          done={cornerDone}
          doneClassName={doneClassName}
          onAdd={() => {
            if (!activeSavedLibrary?.id) return;
            setSavedLibraryCatalogAddBusyId(row.id);
            const ok = addFontEntryToLibrary(activeSavedLibrary.id, libraryEntry);
            if (ok) {
              markSavedLibraryCatalogRecentlyAdded(row.id, 900);
            }
            setSavedLibraryCatalogAddBusyId(null);
          }}
        />
      );
    };

    const downloadBase = {
      tone: 'light',
      layout: 'comfortable',
      className: '!w-auto max-w-[min(100%,12rem)]',
      hidePrimaryLabel: savedLibraryHideDownloadLabel,
    };

    return catalogSearchResults.map((row) => {
      if (row.source === 'google') {
        const family = row.family;
        const entry = row.entry || {};
        const libraryEntry: SavedLibraryFontEntry = {
          id: `google:${family}`,
          label: family,
          source: 'google',
        };
        return {
          id: row.id,
          selected: false,
          title: family,
          subtitleParts: buildSavedLibraryCardMetaParts({
            id: `google:${family}`,
            label: family,
            source: 'google',
          }),
          subtitleClassName: savedLibraryCardMetaClassName,
          previewStyle: { fontFamily: `'${family}', sans-serif` },
          onCardClick: () => openGoogleCatalogEntryInEditorTab(entry),
          downloadSplitButtonProps: {
            ...downloadBase,
            ...buildCatalogDownloadButtonProps({
              family,
              item: entry,
              catalogEntry: entry,
              catalogSource: 'google',
              onDownloadZip: downloadGooglePackageZip,
              onDownloadAsFormat: (it, format) => downloadGoogleAsFormat(it, format),
              onDownloadVariableVariant: downloadGoogleVariableVariant,
              showVariable: entry?.isVariable === true,
            }),
          },
          cornerAction: buildCorner(row, libraryEntry, '!bg-accent !text-white [&_svg]:!text-white'),
        };
      }

      const family = row.family;
      const slug = row.slug || '';
      const item = row.item || {};
      const libraryEntry: SavedLibraryFontEntry = {
        id: `fontsource:${slug}`,
        label: family,
        source: 'fontsource',
        isVariable: Boolean(item?.isVariable),
      };
      return {
        id: row.id,
        selected: false,
        title: family,
        subtitleParts: buildSavedLibraryCardMetaParts({
          id: `fontsource:${slug}`,
          label: family,
          source: 'fontsource',
          isVariable: Boolean(item?.isVariable),
        }),
        subtitleClassName: savedLibraryCardMetaClassName,
        previewStyle: { fontFamily: `'${family}', sans-serif` },
        onCardClick: () => openFontsourceSlugInEditorTab(slug, Boolean(item?.isVariable)),
        downloadSplitButtonProps: {
          ...downloadBase,
          ...buildCatalogDownloadButtonProps({
            family,
            item,
            catalogEntry: item,
            catalogSource: 'fontsource',
            onDownloadZip: downloadFontsourcePackageZip,
            onDownloadAsFormat: (it, format) => downloadFontsourceAsFormat(it, format),
            onDownloadVariableVariant: downloadFontsourceVariableVariant,
            showVariable: Boolean(item?.isVariable),
          }),
        },
        cornerAction: buildCorner(
          row,
          libraryEntry,
          '!bg-red-600 !text-white hover:!bg-red-600 [&_svg]:!text-white',
        ),
      };
    });
  }, [
    activeSavedLibrary,
    addFontEntryToLibrary,
    buildSavedLibraryCardMetaParts,
    catalogSearchResults,
    markSavedLibraryCatalogRecentlyAdded,
    openFontsourceSlugInEditorTab,
    openGoogleCatalogEntryInEditorTab,
    savedLibraryCardMetaClassName,
    savedLibraryCatalogAddBusyId,
    savedLibraryCatalogRecentlyAddedSet,
    savedLibraryHideDownloadLabel,
    savedLibrarySearchQueryTrimmed,
    setSavedLibraryCatalogAddBusyId,
  ]);

  return { activeSavedLibraryItems, activeSavedLibraryCatalogItems };
}
