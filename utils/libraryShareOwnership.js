/** Библиотека из share-ссылки уже есть у текущего пользователя (он делился ею с этого браузера). */
export function findOwnedShareLibrary(payload, savedLibraries) {
  const libraryId = String(payload?.library?.id || '').trim();
  if (!libraryId) return null;
  const list = Array.isArray(savedLibraries) ? savedLibraries : [];
  return list.find((lib) => String(lib?.id || '').trim() === libraryId) || null;
}

export function isShareOwnedByLocalLibraries(payload, savedLibraries) {
  return Boolean(findOwnedShareLibrary(payload, savedLibraries));
}
