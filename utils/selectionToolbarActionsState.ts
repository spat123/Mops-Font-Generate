import type { SelectionToolbarActions } from '../types/savedLibrary';

export const EMPTY_SELECTION_TOOLBAR_ACTIONS: SelectionToolbarActions = {
  selectedCount: 0,
  downloadSelected: null,
  downloadSelectedAsFormat: null,
  moveSelected: null,
  createLibraryFromSelection: null,
};

export function normalizeSelectionToolbarActions(
  nextActions: Partial<SelectionToolbarActions> | null | undefined,
): SelectionToolbarActions {
  if (!nextActions || typeof nextActions !== 'object') {
    return EMPTY_SELECTION_TOOLBAR_ACTIONS;
  }
  return {
    selectedCount: Number(nextActions.selectedCount) || 0,
    downloadSelected:
      typeof nextActions.downloadSelected === 'function' ? nextActions.downloadSelected : null,
    downloadSelectedAsFormat:
      typeof nextActions.downloadSelectedAsFormat === 'function'
        ? nextActions.downloadSelectedAsFormat
        : null,
    moveSelected: typeof nextActions.moveSelected === 'function' ? nextActions.moveSelected : null,
    createLibraryFromSelection:
      typeof nextActions.createLibraryFromSelection === 'function'
        ? nextActions.createLibraryFromSelection
        : null,
  };
}
