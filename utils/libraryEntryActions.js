function isValidLibraryEntry(libraryEntry) {
  return Boolean(libraryEntry && typeof libraryEntry.label === 'string' && libraryEntry.label.trim());
}

export async function addLibraryEntryToLibrary({
  libraryId,
  libraryEntry,
  onAddFontToLibrary,
}) {
  if (!libraryId || !isValidLibraryEntry(libraryEntry) || typeof onAddFontToLibrary !== 'function') {
    return false;
  }
  return (await onAddFontToLibrary(libraryId, libraryEntry)) !== false;
}

export function requestCreateLibraryFromEntry({
  libraryEntry,
  onRequestCreateLibrary,
}) {
  if (!isValidLibraryEntry(libraryEntry) || typeof onRequestCreateLibrary !== 'function') {
    return false;
  }
  onRequestCreateLibrary([libraryEntry]);
  return true;
}
