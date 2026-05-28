import { useMemo } from 'react';
import type { SavedLibraryRecord, SessionFontRecord } from '../../types/editorFonts';

export type UseCatalogSessionExclusionParams<T> = {
  items: T[];
  fonts: SessionFontRecord[];
  fontLibraries: SavedLibraryRecord[];
  sourcePrefix: string;
  getKey?: (item: T) => string | null | undefined;
  isInSession?: (fonts: SessionFontRecord[], key: string) => boolean;
  addingKey?: string | null;
  recentlyAddedSet?: Set<string> | null;
};

/**
 * Общий фильтр: "показываем в каталоге только то, чего ещё нет в сессии/библиотеках",
 * но при этом оставляем видимыми ключи, которые сейчас добавляются или только что добавлены (sticky).
 */
export function useCatalogSessionExclusion<T>({
  items,
  fonts,
  fontLibraries,
  sourcePrefix,
  getKey,
  isInSession,
  addingKey,
  recentlyAddedSet,
}: UseCatalogSessionExclusionParams<T>) {
  const libraryFontEntryIds = useMemo(() => {
    const ids = new Set<string>();
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
