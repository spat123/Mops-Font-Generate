import { useEffect } from 'react';
import type { SelectionToolbarActions } from '../../types/savedLibrary';

export type UseSelectionActionsEffectParams = {
  isActive?: boolean;
  onSelectionActionsChange?: (actions: SelectionToolbarActions | null) => void;
  selectedCount: number;
  downloadSelected?: (() => void) | null;
  downloadSelectedAsFormat?: ((format: string) => void) | null;
  moveSelected?: ((targetLibraryId: string) => void) | null;
  createLibraryFromSelection?: (() => void) | null;
};

export function useSelectionActionsEffect({
  isActive = true,
  onSelectionActionsChange,
  selectedCount,
  downloadSelected,
  downloadSelectedAsFormat,
  moveSelected,
  createLibraryFromSelection,
}: UseSelectionActionsEffectParams) {
  useEffect(() => {
    if (typeof onSelectionActionsChange !== 'function') return;
    if (!isActive) return;
    onSelectionActionsChange({
      selectedCount,
      downloadSelected: downloadSelected ?? null,
      downloadSelectedAsFormat: downloadSelectedAsFormat ?? null,
      moveSelected: moveSelected ?? null,
      createLibraryFromSelection: createLibraryFromSelection ?? null,
    });
    return () => onSelectionActionsChange(null);
  }, [
    createLibraryFromSelection,
    downloadSelected,
    downloadSelectedAsFormat,
    isActive,
    moveSelected,
    onSelectionActionsChange,
    selectedCount,
  ]);
}
