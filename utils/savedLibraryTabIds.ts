export const SAVED_LIBRARY_TAB_PREFIX = 'saved-library:';

export function makeSavedLibraryTabId(libraryId: string): string {
  return `${SAVED_LIBRARY_TAB_PREFIX}${libraryId}`;
}

export function readSavedLibraryId(tabId: string | null | undefined): string | null {
  return typeof tabId === 'string' && tabId.startsWith(SAVED_LIBRARY_TAB_PREFIX)
    ? tabId.slice(SAVED_LIBRARY_TAB_PREFIX.length)
    : null;
}
