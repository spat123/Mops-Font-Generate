import { useCallback, useEffect, useState } from 'react';
import { moveItemById } from '../utils/arrayOrder';
import { sanitizeLibrary } from '../utils/fontLibraryUtils';
import type { SavedLibraryRecord } from '../types/editorFonts';

export const FONT_LIBRARIES_STORAGE_KEY = 'fontLibrarySidebarLibraries';

type LibraryDraft = {
  name?: string;
  fonts?: SavedLibraryRecord['fonts'];
};

function readStoredLibraries(): SavedLibraryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FONT_LIBRARIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : [])
      .map((row) => sanitizeLibrary(row) as SavedLibraryRecord | null)
      .filter((row): row is SavedLibraryRecord => Boolean(row));
  } catch {
    return [];
  }
}

export function useFontLibraries() {
  const [libraries, setLibraries] = useState<SavedLibraryRecord[]>(() => readStoredLibraries());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FONT_LIBRARIES_STORAGE_KEY, JSON.stringify(libraries));
    } catch {
      /* ignore quota / private mode */
    }
  }, [libraries]);

  const createLibrary = useCallback((draft: LibraryDraft) => {
    const candidate = sanitizeLibrary({
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `library:${crypto.randomUUID()}`
          : `library:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: draft?.name,
      fonts: draft?.fonts,
    }) as SavedLibraryRecord | null;
    if (!candidate) return null;
    setLibraries((prev) => [candidate, ...prev]);
    return candidate;
  }, []);

  const updateLibrary = useCallback((libraryId: string, draft: Partial<SavedLibraryRecord>) => {
    let updatedLibrary: SavedLibraryRecord | null = null;
    setLibraries((prev) =>
      prev.map((item) => {
        if (item.id !== libraryId) return item;
        const next = sanitizeLibrary({
          id: item.id,
          name: draft?.name ?? item.name,
          fonts: Array.isArray(draft?.fonts) ? draft.fonts : item.fonts,
        }) as SavedLibraryRecord | null;
        updatedLibrary = next || item;
        return updatedLibrary;
      }),
    );
    return updatedLibrary;
  }, []);

  const deleteLibrary = useCallback((libraryId: string) => {
    setLibraries((prev) => prev.filter((item) => item.id !== libraryId));
  }, []);

  const reorderLibraries = useCallback((draggedId: string, targetId: string) => {
    setLibraries((prev) => moveItemById(prev, draggedId, targetId));
  }, []);

  const reorderLibraryFonts = useCallback(
    (libraryId: string, draggedFontId: string, targetFontId: string) => {
      setLibraries((prev) =>
        prev.map((item) =>
          item.id === libraryId
            ? {
                ...item,
                fonts: moveItemById(item.fonts || [], draggedFontId, targetFontId),
              }
            : item,
        ),
      );
    },
    [],
  );

  const clearAllLibraries = useCallback(() => {
    setLibraries([]);
  }, []);

  return {
    libraries,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    reorderLibraries,
    reorderLibraryFonts,
    clearAllLibraries,
  };
}
