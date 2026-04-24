import { useMemo } from 'react';

/**
 * Общий фильтр: "показываем в каталоге только то, чего ещё нет в сессии/библиотеках",
 * но при этом оставляем видимыми ключи, которые сейчас добавляются или только что добавлены (sticky).
 */
export function useCatalogSessionExclusion({
  items,
  fonts,
  fontLibraries,
  sourcePrefix,
  getKey,
  isInSession,
  addingKey,
  recentlyAddedSet,
}) {
  const libraryFontEntryIds = useMemo(() => {
    const ids = new Set();
    (Array.isArray(fontLibraries) ? fontLibraries : []).forEach((library) => {
      (Array.isArray(library?.fonts) ? library.fonts : []).forEach((font) => {
        const id = String(font?.id || '').trim();
        if (id) ids.add(id);
      });
    });
    return ids;
  }, [fontLibraries]);

  const itemsNotInSession = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list.filter((item) => {
      const key = getKey?.(item);
      if (!key) return false;
      const libraryEntryId = `${sourcePrefix}:${key}`;
      return (
        (!isInSession?.(fonts, key) && !libraryFontEntryIds.has(libraryEntryId)) ||
        addingKey === key ||
        Boolean(recentlyAddedSet?.has?.(key))
      );
    });
  }, [items, getKey, sourcePrefix, isInSession, fonts, libraryFontEntryIds, addingKey, recentlyAddedSet]);

  return { libraryFontEntryIds, itemsNotInSession };
}

