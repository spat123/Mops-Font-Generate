export const SAVED_LIBRARY_TAB_PREFIX = 'saved-library:';

export function makeSavedLibraryTabId(libraryId) {
  return `${SAVED_LIBRARY_TAB_PREFIX}${libraryId}`;
}

export function readSavedLibraryId(tabId) {
  return typeof tabId === 'string' && tabId.startsWith(SAVED_LIBRARY_TAB_PREFIX)
    ? tabId.slice(SAVED_LIBRARY_TAB_PREFIX.length)
    : null;
}
