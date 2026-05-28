import { useCallback, useRef, useState, type FocusEvent, type RefObject } from 'react';

/** Строка поиска и expand-состояние тулбара сохранённой библиотеки. */
export function useSavedLibrarySearchQuery() {
  const [savedLibrarySearchQuery, setSavedLibrarySearchQuery] = useState('');
  const [isSavedLibrarySearchExpanded, setIsSavedLibrarySearchExpanded] = useState(false);
  const savedLibrarySearchWrapRef = useRef<HTMLDivElement | null>(null);
  const savedLibrarySearchInputRef = useRef<HTMLInputElement | null>(null);

  const savedLibrarySearchQueryTrimmed = savedLibrarySearchQuery.trim();
  const savedLibrarySearchActive =
    isSavedLibrarySearchExpanded || savedLibrarySearchQueryTrimmed.length > 0;

  const clearSavedLibrarySearch = useCallback(() => {
    setSavedLibrarySearchQuery('');
    setIsSavedLibrarySearchExpanded(false);
    savedLibrarySearchInputRef.current?.blur();
  }, []);

  const clearSavedLibrarySearchTextOnly = useCallback(() => {
    setSavedLibrarySearchQuery('');
  }, []);

  const openSavedLibrarySearch = useCallback(() => {
    setIsSavedLibrarySearchExpanded(true);
    window.setTimeout(() => {
      savedLibrarySearchInputRef.current?.focus();
    }, 320);
  }, []);

  const resetSavedLibrarySearch = useCallback(() => {
    setSavedLibrarySearchQuery('');
    setIsSavedLibrarySearchExpanded(false);
    savedLibrarySearchInputRef.current?.blur();
  }, []);

  const handleSavedLibrarySearchBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const nextFocusedElement = event.relatedTarget as Node | null;
      if (
        nextFocusedElement &&
        savedLibrarySearchWrapRef.current instanceof HTMLElement &&
        savedLibrarySearchWrapRef.current.contains(nextFocusedElement)
      ) {
        return;
      }
      if (!savedLibrarySearchQuery.trim()) {
        setIsSavedLibrarySearchExpanded(false);
      }
    },
    [savedLibrarySearchQuery],
  );

  return {
    savedLibrarySearchQuery,
    setSavedLibrarySearchQuery,
    setIsSavedLibrarySearchExpanded,
    savedLibrarySearchQueryTrimmed,
    savedLibrarySearchActive,
    savedLibrarySearchWrapRef: savedLibrarySearchWrapRef as RefObject<HTMLDivElement | null>,
    savedLibrarySearchInputRef: savedLibrarySearchInputRef as RefObject<HTMLInputElement | null>,
    clearSavedLibrarySearch,
    clearSavedLibrarySearchTextOnly,
    openSavedLibrarySearch,
    resetSavedLibrarySearch,
    handleSavedLibrarySearchBlur,
  };
}
