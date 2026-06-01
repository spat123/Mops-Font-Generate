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
 * Фильтр каталога: скрываем только то, что уже в сессии редактора;
 * записи в сохранённых библиотеках остаются в каталоге (libraryFontEntryIds — для UI «+»).
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
      return (
        !isInSession?.(fonts, key) ||
        addingKey === key ||
        Boolean(recentlyAddedSet?.has?.(key))
      );
    });
  }, [items, getKey, isInSession, fonts, addingKey, recentlyAddedSet]);

  return { libraryFontEntryIds, itemsNotInSession };
}
