import type { SavedLibraryRecord } from '../types/editorFonts';
import type { LibrarySharePayload } from './libraryShareLink';

/** Библиотека из share-ссылки уже есть у текущего пользователя (он делился ею с этого браузера). */
export function findOwnedShareLibrary(
  payload: LibrarySharePayload | null | undefined,
  savedLibraries: SavedLibraryRecord[] | null | undefined,
): SavedLibraryRecord | null {
  const libraryId = String(payload?.library?.id || '').trim();
  if (!libraryId) return null;
  const list = Array.isArray(savedLibraries) ? savedLibraries : [];
  return list.find((lib) => String(lib?.id || '').trim() === libraryId) || null;
}

export function isShareOwnedByLocalLibraries(
  payload: LibrarySharePayload | null | undefined,
  savedLibraries: SavedLibraryRecord[] | null | undefined,
): boolean {
  return Boolean(findOwnedShareLibrary(payload, savedLibraries));
}
