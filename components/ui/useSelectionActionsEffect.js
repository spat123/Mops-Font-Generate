import { useEffect } from 'react';

export function useSelectionActionsEffect({
  isActive = true,
  onSelectionActionsChange,
  selectedCount,
  downloadSelected,
  downloadSelectedAsFormat,
  moveSelected,
  createLibraryFromSelection,
}) {
  useEffect(() => {
    if (typeof onSelectionActionsChange !== 'function') return;
    if (!isActive) return;
    onSelectionActionsChange({
      selectedCount,
      downloadSelected,
      downloadSelectedAsFormat,
      moveSelected,
      createLibraryFromSelection,
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
