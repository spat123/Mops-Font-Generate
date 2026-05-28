import { useCallback, useEffect, useRef } from 'react';
import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import { newEmptySlotId } from '../utils/editorShellStorage';
import { revokeObjectURL } from '../utils/localFontProcessor';
import type { Dispatch, SetStateAction } from 'react';
import type { SessionFontRecord } from '../types/editorFonts';

type UseEmptyPreviewSlotsParams = {
  emptySlotIds: string[];
  setEmptySlotIds: Dispatch<SetStateAction<string[]>>;
  catalogPreviewSlotsById: Record<string, SessionFontRecord | null | undefined>;
  setCatalogPreviewSlotsById: Dispatch<
    SetStateAction<Record<string, SessionFontRecord | null | undefined>>
  >;
  mainTab: string;
  setMainTab: (tab: string) => void;
  setSelectedFont: (font: SessionFontRecord | null) => void;
};

/**
 * Пустые вкладки «Новый», preview-слоты каталога и их очистка.
 */
export function useEmptyPreviewSlots({
  emptySlotIds,
  setEmptySlotIds,
  catalogPreviewSlotsById,
  setCatalogPreviewSlotsById,
  mainTab,
  setMainTab,
  setSelectedFont,
}: UseEmptyPreviewSlotsParams) {
  const catalogPreviewSlotsByIdRef = useRef(catalogPreviewSlotsById);
  catalogPreviewSlotsByIdRef.current = catalogPreviewSlotsById;

  const releaseCatalogPreviewFont = useCallback((font: SessionFontRecord | null | undefined) => {
    if (!font || typeof font.url !== 'string') return;
    revokeObjectURL(font.url);
  }, []);

  useEffect(() => {
    return () => {
      const slots = catalogPreviewSlotsByIdRef.current || {};
      Object.values(slots).forEach((font) => releaseCatalogPreviewFont(font));
    };
  }, [releaseCatalogPreviewFont]);

  useEffect(() => {
    const liveSlotIds = new Set(emptySlotIds);
    setCatalogPreviewSlotsById((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      keys.forEach((slotId) => {
        if (liveSlotIds.has(slotId)) return;
        changed = true;
        releaseCatalogPreviewFont(next[slotId]);
        delete next[slotId];
      });
      return changed ? next : prev;
    });
  }, [emptySlotIds, releaseCatalogPreviewFont, setCatalogPreviewSlotsById]);

  const addEmptyPreviewSlot = useCallback(() => {
    const id = newEmptySlotId();
    setEmptySlotIds((s) => [...s, id]);
    setMainTab(`${EMPTY_PREFIX}${id}`);
    setSelectedFont(null);
  }, [setEmptySlotIds, setMainTab, setSelectedFont]);

  const handleRemoveEmptySlot = useCallback(
    (slotId: string) => {
      const tabKey = `${EMPTY_PREFIX}${slotId}`;
      setEmptySlotIds((ids) => ids.filter((x) => x !== slotId));
      setCatalogPreviewSlotsById((prev) => {
        if (!prev?.[slotId]) return prev;
        const next = { ...prev };
        releaseCatalogPreviewFont(next[slotId]);
        delete next[slotId];
        return next;
      });
      if (mainTab === tabKey) {
        setMainTab('library');
      }
    },
    [mainTab, releaseCatalogPreviewFont, setCatalogPreviewSlotsById, setEmptySlotIds, setMainTab],
  );

  useEffect(() => {
    if (!mainTab.startsWith(EMPTY_PREFIX)) return;
    const slotId = mainTab.slice(EMPTY_PREFIX.length);
    if (!emptySlotIds.includes(slotId)) {
      setMainTab('library');
    }
  }, [mainTab, emptySlotIds, setMainTab]);

  return { addEmptyPreviewSlot, handleRemoveEmptySlot };
}
