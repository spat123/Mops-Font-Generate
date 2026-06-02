import React, { useMemo } from 'react';
import { buildCatalogDownloadButtonProps } from '../components/catalog/buildCatalogDownloadButtonProps';
import { SavedLibraryCatalogAddCorner } from '../components/library/SavedLibraryCatalogAddCorner';
import { DuplicateIcon, OpenExternalIcon, ShareIcon, TrashIcon } from '../components/ui/CommonIcons';
import { moveAndSwapIconUrl } from '../components/ui/editIconUrls';
import { buildSavedLibraryDownloadSplitButtonProps } from '../utils/savedLibraryFontDownload';
import {
  isExternalLibraryFontSource,
  isLibraryFontRecentlyAdded,
  savedLibraryFontCanOpenInEditor,
} from '../utils/fontLibraryUtils';
import {
  countSameCatalogFontInLibrary,
  formatLibraryPickerLabel,
} from '../utils/fontLibraryUtils';
import {
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
} from '../utils/catalogDownloadActions';
import { buildCatalogCardMetaSplit } from '../utils/buildCatalogCardMetaParts';
import { getSessionFontCardPreviewStyle } from '../utils/sessionFontCardPreview';
import type { SavedLibraryRecord, SessionFontRecord } from '../types/editorFonts';
import type {
  SavedLibraryCardViewItem,
  SavedLibraryCatalogSearchRow,
} from '../types/savedLibraryCard';
import type { OpenLibraryFontEntryOptions } from './useOpenLibraryFontEntry';

type SavedLibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

type UseSavedLibraryCardItemsParams = {
  activeSavedLibrary: SavedLibraryRecord | null;
  filteredActiveSavedLibraryFonts: SavedLibraryFontEntry[];
  catalogSearchResults: SavedLibraryCatalogSearchRow[];
  savedLibrarySearchQueryTrimmed: string;
  mainTab: string;
  fontLibraries: SavedLibraryRecord[];
  selectedSavedLibraryFontIds: Set<string>;
  buildSavedLibraryCardMetaSplit: (
    font: SavedLibraryFontEntry,
    sessionFont?: SessionFontRecord | null,
  ) => { left: string[]; right: string[] };
  savedLibraryCardMetaClassName: string;
  savedLibraryHideDownloadLabel: boolean;
  resolveSessionFontForLibraryEntry: (font: SavedLibraryFontEntry) => SessionFontRecord | null | undefined;
  openLibraryFontEntry: (
    font: SavedLibraryFontEntry,
    options?: OpenLibraryFontEntryOptions,
  ) => void | Promise<void>;
  onSavedLibrarySelectionCardClick: (event: React.MouseEvent, fontId: string) => void;
  startSavedLibraryCardLongPress: (event: React.PointerEvent, fontId: string) => void;
  clearSavedLibraryLongPressTimer: () => void;
  openLibraryShareDialog: (libraryId: string, options?: { onlyFontIds?: string[] }) => void;
  handleUpdateSavedLibrary: (libraryId: string, draft: Partial<SavedLibraryRecord>) => void;
  openGoogleCatalogEntryInEditorTab: (entry: Record<string, unknown>) => void;
  openFontsourceSlugInEditorTab: (slug: string, isVariable?: boolean) => void;
  addFontEntryToLibrary: (libraryId: string, libraryEntry: SavedLibraryFontEntry) => boolean;
  duplicateLibraryFontEntryInLibrary: (libraryId: string, fontEntry: SavedLibraryFontEntry) => boolean;
  moveSingleSavedLibraryFont: (
    fontEntry: SavedLibraryFontEntry,
    targetLibraryId: string,
  ) => boolean | Promise<boolean>;
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
  buildSavedLibraryCardMetaSplit,
  savedLibraryCardMetaClassName,
  savedLibraryHideDownloadLabel,
  resolveSessionFontForLibraryEntry,
  openLibraryFontEntry,
  onSavedLibrarySelectionCardClick,
  startSavedLibraryCardLongPress,
  clearSavedLibraryLongPressTimer,
  openLibraryShareDialog,
  handleUpdateSavedLibrary,
  openGoogleCatalogEntryInEditorTab,
  openFontsourceSlugInEditorTab,
  addFontEntryToLibrary,
  duplicateLibraryFontEntryInLibrary,
  moveSingleSavedLibraryFont,
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
      const cardMeta = buildSavedLibraryCardMetaSplit(font, sessionFont);
      const canOpenInEditor = savedLibraryFontCanOpenInEditor(font, sessionFont);
      return {
        id: font.id,
        variant: 'catalog',
        selected: sessionFont ? mainTab === sessionFont.id : false,
        batchSelected: selectedSavedLibraryFontIds.has(font.id),
        title: font.label,
        recentlyAdded: isLibraryFontRecentlyAdded(font, now),
        subtitleLeftParts: cardMeta.left,
        subtitleRightParts: cardMeta.right,
        subtitleClassName: savedLibraryCardMetaClassName,
        previewStyle: sessionFont ? getSessionFontCardPreviewStyle(sessionFont) : undefined,
        onCardClick: (event) => {
          onSavedLibrarySelectionCardClick(event as React.MouseEvent, font.id);
        },
        onPointerDown: (event) => startSavedLibraryCardLongPress(event, font.id),
        onPointerUp: clearSavedLibraryLongPressTimer,
        onPointerLeave: clearSavedLibraryLongPressTimer,
        onPointerCancel: clearSavedLibraryLongPressTimer,
        onOpen: canOpenInEditor
          ? () => {
              void openLibraryFontEntry(font);
            }
          : undefined,
        openAriaLabel: font.label ? `Открыть ${font.label} в редакторе` : 'Открыть в редакторе',
        downloadSplitButtonProps: (() => {
          const props = buildSavedLibraryDownloadSplitButtonProps(font, sessionFont);
          if (!props) return null;
          const external = isExternalLibraryFontSource(font.source);
          return {
            ...props,
            hidePrimaryLabel: external ? false : savedLibraryHideDownloadLabel,
          };
        })(),
        menuItems: [
          ...(canOpenInEditor
            ? [
                {
                  key: 'open',
                  label: 'Открыть',
                  icon: <OpenExternalIcon />,
                  onSelect: () => {
                    void openLibraryFontEntry(font);
                  },
                },
              ]
            : []),
          ...(canOpenInEditor
            ? [
                {
                  key: 'duplicate',
                  label: 'Дублировать',
                  icon: <DuplicateIcon />,
                  onSelect: () => {
                    if (!activeSavedLibrary?.id) return;
                    duplicateLibraryFontEntryInLibrary(activeSavedLibrary.id, font);
                  },
                },
              ]
            : []),
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
              return targets.map((library) => {
                const matchCount = countSameCatalogFontInLibrary(font, library.fonts || []);
                return {
                  key: `move-${library.id}`,
                  label: formatLibraryPickerLabel(library.name, matchCount),
                  onSelect: () => {
                    void moveSingleSavedLibraryFont(font, library.id);
                  },
                };
              });
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
    duplicateLibraryFontEntryInLibrary,
    filteredActiveSavedLibraryFonts,
    buildSavedLibraryCardMetaSplit,
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
        const googleMeta = buildCatalogCardMetaSplit({
          category: entry?.category,
          subsets: Array.isArray(entry?.subsets) ? entry.subsets : [],
          isVariable: entry?.isVariable === true,
          hasItalic: entry?.hasItalic === true || entry?.hasItalicStyles === true,
          styleCount: Number(entry?.styleCount) || 0,
        });
        return {
          id: row.id,
          variant: 'catalog',
          selected: false,
          title: family,
          subtitleLeftParts: googleMeta.left,
          subtitleRightParts: googleMeta.right,
          subtitleClassName: savedLibraryCardMetaClassName,
          previewStyle: { fontFamily: `'${family}', sans-serif` },
          onOpen: () => openGoogleCatalogEntryInEditorTab(entry),
          openAriaLabel: `Открыть ${family} в редакторе`,
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
      const fontsourceMeta = buildCatalogCardMetaSplit({
        category: item?.category,
        subsets: Array.isArray(item?.subsets) ? item.subsets : [],
        isVariable: Boolean(item?.isVariable),
        hasItalic: Boolean(item?.hasItalic),
        styleCount: Number(item?.styleCount) || 0,
      });
      return {
        id: row.id,
        variant: 'catalog',
        selected: false,
        title: family,
        subtitleLeftParts: fontsourceMeta.left,
        subtitleRightParts: fontsourceMeta.right,
        subtitleClassName: savedLibraryCardMetaClassName,
        previewStyle: { fontFamily: `'${family}', sans-serif` },
        onOpen: () => openFontsourceSlugInEditorTab(slug, Boolean(item?.isVariable)),
        openAriaLabel: `Открыть ${family} в редакторе`,
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
    buildSavedLibraryCardMetaSplit,
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
