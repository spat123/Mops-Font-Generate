import { useCallback, useEffect, useState } from 'react';
import { moveItemById } from '../utils/arrayOrder';
import { sanitizeLibrary } from '../utils/fontLibraryUtils';

export const FONT_LIBRARIES_STORAGE_KEY = 'fontLibrarySidebarLibraries';

function readStoredLibraries() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FONT_LIBRARIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return (Array.isArray(parsed) ? parsed : [])
      .map(sanitizeLibrary)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function useFontLibraries() {
  const [libraries, setLibraries] = useState(() => readStoredLibraries());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FONT_LIBRARIES_STORAGE_KEY, JSON.stringify(libraries));
    } catch {
      /* ignore quota / private mode */
    }
  }, [libraries]);

  const createLibrary = useCallback((draft) => {
    const candidate = sanitizeLibrary({
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `library:${crypto.randomUUID()}`
          : `library:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: draft?.name,
      fonts: draft?.fonts,
    });
    if (!candidate) return null;
    setLibraries((prev) => [candidate, ...prev]);
    return candidate;
  }, []);

  const updateLibrary = useCallback((libraryId, draft) => {
    let updatedLibrary = null;
    setLibraries((prev) =>
      prev.map((item) => {
        if (item.id !== libraryId) return item;
        const next = sanitizeLibrary({
          id: item.id,
          name: draft?.name ?? item.name,
          fonts: Array.isArray(draft?.fonts) ? draft.fonts : item.fonts,
        });
        updatedLibrary = next || item;
        return updatedLibrary;
      }),
    );
    return updatedLibrary;
  }, []);

  const deleteLibrary = useCallback((libraryId) => {
    setLibraries((prev) => prev.filter((item) => item.id !== libraryId));
  }, []);

  const reorderLibraries = useCallback((draggedId, targetId) => {
    setLibraries((prev) => moveItemById(prev, draggedId, targetId));
  }, []);

  const reorderLibraryFonts = useCallback((libraryId, draggedFontId, targetFontId) => {
    setLibraries((prev) =>
      prev.map((item) =>
        item.id === libraryId
          ? {
              ...item,
              fonts: moveItemById(item.fonts, draggedFontId, targetFontId),
            }
          : item,
      ),
    );
  }, []);

  return {
    libraries,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    reorderLibraries,
    reorderLibraryFonts,
  };
}
