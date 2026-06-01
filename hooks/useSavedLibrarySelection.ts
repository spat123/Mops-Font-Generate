import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../utils/appNotify';
import { useLongPressMultiSelect } from '../components/ui/useLongPressMultiSelect';
import { sanitizeLibraryFont } from '../utils/fontLibraryUtils';
import { applySavedLibraryFontMove } from '../utils/savedLibraryFontMove';
import {
  countDownloadableSavedLibraryFonts,
  downloadSelectedSavedLibraryFonts,
  downloadSelectedSavedLibraryFontsAsFormat,
} from '../utils/savedLibraryFontDownload';
import type { SavedLibraryRecord } from '../types/editorFonts';

type SavedLibraryFontEntry = NonNullable<SavedLibraryRecord['fonts']>[number];

type LibraryShareSnapshot = {
  id: string;
  name: string;
  fonts: SavedLibraryFontEntry[];
};

type UseSavedLibrarySelectionParams = {
  activeSavedLibrary: SavedLibraryRecord | null;
  filteredActiveSavedLibraryFonts: SavedLibraryFontEntry[];
  fontLibraries: SavedLibraryRecord[];
  handleUpdateSavedLibrary: (libraryId: string, draft: Partial<SavedLibraryRecord>) => void;
  isInteractiveTarget?: (target: EventTarget | null) => boolean;
};

/**
 * Multi-select, share-диалог и bulk/single move для сохранённой библиотеки.
 */
export function useSavedLibrarySelection({
  activeSavedLibrary,
  filteredActiveSavedLibraryFonts,
  fontLibraries,
  handleUpdateSavedLibrary,
  isInteractiveTarget,
}: UseSavedLibrarySelectionParams) {
  const [libraryShareDialogOpen, setLibraryShareDialogOpen] = useState(false);
  const [libraryShareSnapshot, setLibraryShareSnapshot] = useState<LibraryShareSnapshot | null>(null);
  const [libraryShareSeedIds, setLibraryShareSeedIds] = useState<string[]>([]);
  const [isSavedLibraryMoveBusy, setIsSavedLibraryMoveBusy] = useState(false);

  const {
    selectedKeys: selectedSavedLibraryFontIds,
    setSelectedKeys: setSelectedSavedLibraryFontIds,
    startLongPress: startSavedLibraryCardLongPress,
    onCardClick: onSavedLibrarySelectionCardClick,
    clearLongPressTimer: clearSavedLibraryLongPressTimer,
    pruneSelection: pruneSavedLibrarySelection,
  } = useLongPressMultiSelect({ longPressMs: 220, isInteractiveTarget });

  useEffect(() => {
    if (!activeSavedLibrary) {
      setSelectedSavedLibraryFontIds(new Set());
      return;
    }
    pruneSavedLibrarySelection(new Set(filteredActiveSavedLibraryFonts.map((font) => font.id)));
  }, [
    activeSavedLibrary,
    filteredActiveSavedLibraryFonts,
    pruneSavedLibrarySelection,
    setSelectedSavedLibraryFontIds,
  ]);

  const selectedSavedLibraryFonts = useMemo(
    () => filteredActiveSavedLibraryFonts.filter((font) => selectedSavedLibraryFontIds.has(font.id)),
    [filteredActiveSavedLibraryFonts, selectedSavedLibraryFontIds],
  );

  const openLibraryShareDialog = useCallback(
    (libraryId: string | null = null, options: { onlyFontIds?: string[] } = {}) => {
      const id = libraryId || activeSavedLibrary?.id;
      const library = fontLibraries.find((l) => l.id === id);
      if (!library?.fonts?.length) {
        toast.info('В этой библиотеке пока нет шрифтов');
        return;
      }
      const onlyFontIds = Array.isArray(options.onlyFontIds)
        ? options.onlyFontIds.map(String).filter(Boolean)
        : null;
      const isActiveContext = id === activeSavedLibrary?.id;
      let seeds: string[];
      if (onlyFontIds && onlyFontIds.length > 0) {
        seeds = onlyFontIds.filter((fid) => library.fonts!.some((f) => String(f.id) === String(fid)));
        if (seeds.length === 0) {
          seeds = library.fonts!.map((f) => f.id);
        }
      } else if (isActiveContext && selectedSavedLibraryFontIds.size > 0) {
        seeds = [...selectedSavedLibraryFontIds].filter((fid) =>
          library.fonts!.some((f) => String(f.id) === String(fid)),
        );
      } else {
        seeds = library.fonts!.map((f) => f.id);
      }
      setLibraryShareSnapshot({
        id: library.id,
        name: library.name,
        fonts: Array.isArray(library.fonts) ? [...library.fonts] : [],
      });
      setLibraryShareSeedIds(seeds.map(String));
      setLibraryShareDialogOpen(true);
    },
    [activeSavedLibrary?.id, fontLibraries, selectedSavedLibraryFontIds],
  );

  const openLibraryShareDialogRef = useRef<(libraryId?: string | null, options?: { onlyFontIds?: string[] }) => void>(
    () => {},
  );
  openLibraryShareDialogRef.current = openLibraryShareDialog;

  const closeLibraryShareDialog = useCallback(() => {
    setLibraryShareDialogOpen(false);
    setLibraryShareSnapshot(null);
    setLibraryShareSeedIds([]);
  }, []);

  const selectedSavedLibraryDownloadableCount = useMemo(
    () => countDownloadableSavedLibraryFonts(selectedSavedLibraryFonts),
    [selectedSavedLibraryFonts],
  );

  const downloadSelectedSavedLibrary = useCallback(
    () => downloadSelectedSavedLibraryFonts(selectedSavedLibraryFonts),
    [selectedSavedLibraryFonts],
  );

  const downloadSelectedSavedLibraryAsFormat = useCallback(
    (format: string) => downloadSelectedSavedLibraryFontsAsFormat(selectedSavedLibraryFonts, format),
    [selectedSavedLibraryFonts],
  );

  const moveSelectedSavedLibraryFonts = useCallback(
    async (targetLibraryId: string) => {
      const selectedEntries = filteredActiveSavedLibraryFonts.filter((font) =>
        selectedSavedLibraryFontIds.has(font.id),
      );
      if (selectedEntries.length === 0) return false;

      setIsSavedLibraryMoveBusy(true);
      try {
        const { ok, movedCount, targetName } = applySavedLibraryFontMove({
          activeSavedLibrary,
          targetLibraryId,
          fontLibraries,
          normalizedEntries: selectedEntries,
          handleUpdateSavedLibrary,
        });
        if (!ok) {
          toast.info('Нечего переносить: выбранные шрифты уже есть в целевой библиотеке');
          return false;
        }

        setSelectedSavedLibraryFontIds(new Set());
        toast.success(
          movedCount === 1
            ? `Перенесен в «${targetName}»`
            : `Перенесено ${movedCount} шрифтов в «${targetName}»`,
        );
        return true;
      } finally {
        setIsSavedLibraryMoveBusy(false);
      }
    },
    [
      activeSavedLibrary,
      filteredActiveSavedLibraryFonts,
      fontLibraries,
      handleUpdateSavedLibrary,
      selectedSavedLibraryFontIds,
      setSelectedSavedLibraryFontIds,
    ],
  );

  const moveSingleSavedLibraryFont = useCallback(
    async (fontEntry: SavedLibraryFontEntry, targetLibraryId: string) => {
      const normalizedEntry = sanitizeLibraryFont(fontEntry);
      if (!normalizedEntry) return false;

      setIsSavedLibraryMoveBusy(true);
      try {
        const { ok, targetName } = applySavedLibraryFontMove({
          activeSavedLibrary,
          targetLibraryId,
          fontLibraries,
          normalizedEntries: [normalizedEntry],
          handleUpdateSavedLibrary,
        });
        if (!ok) {
          toast.info(`Шрифт уже есть в «${targetName}»`);
          return false;
        }

        setSelectedSavedLibraryFontIds(new Set());
        toast.success(`Перенесен в «${targetName}»`);
        return true;
      } finally {
        setIsSavedLibraryMoveBusy(false);
      }
    },
    [activeSavedLibrary, fontLibraries, handleUpdateSavedLibrary, setSelectedSavedLibraryFontIds],
  );

  return {
    libraryShareDialogOpen,
    libraryShareSnapshot,
    libraryShareSeedIds,
    closeLibraryShareDialog,
    openLibraryShareDialog,
    openLibraryShareDialogRef,
    isSavedLibraryMoveBusy,
    selectedSavedLibraryFontIds,
    setSelectedSavedLibraryFontIds,
    startSavedLibraryCardLongPress,
    onSavedLibrarySelectionCardClick,
    clearSavedLibraryLongPressTimer,
    selectedSavedLibraryFonts,
    selectedSavedLibraryDownloadableCount,
    downloadSelectedSavedLibrary,
    downloadSelectedSavedLibraryAsFormat,
    moveSelectedSavedLibraryFonts,
    moveSingleSavedLibraryFont,
  };
}
