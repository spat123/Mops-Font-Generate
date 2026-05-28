import { useCallback, useEffect, useMemo, useState } from 'react';
import { LIBRARY_MAIN_TABS } from '../constants/fontsLibraryScreen';
import { countFontsByScope, buildScopeSelectOptions } from '../utils/fontLibraryScopeUi';
import { makeSavedLibraryTabId, readSavedLibraryId } from '../utils/savedLibraryTabIds';
import type { SavedLibraryRecord } from '../types/editorFonts';

const SAVED_LIBRARY_VARIABLE_OPTIONS = [
  { value: 'variable', label: 'Вариативные' },
  { value: 'static', label: 'Статические' },
] as const;

type UseSavedLibraryFiltersParams = {
  fontLibraries: SavedLibraryRecord[];
  fontsLibraryTab: string;
  resetSavedLibrarySearch: () => void;
};

/**
 * Фильтры, scope и вкладки экрана сохранённых библиотек.
 */
export function useSavedLibraryFilters({
  fontLibraries,
  fontsLibraryTab,
  resetSavedLibrarySearch,
}: UseSavedLibraryFiltersParams) {
  const [savedLibraryFontsScope, setSavedLibraryFontsScope] = useState('all');
  const [savedLibraryFilterSubsets, setSavedLibraryFilterSubsets] = useState<string[]>([]);
  const [savedLibraryFilterVariable, setSavedLibraryFilterVariable] = useState('all');
  const [savedLibraryFilterItalic, setSavedLibraryFilterItalic] = useState(false);

  useEffect(() => {
    if (savedLibraryFontsScope === 'google' || savedLibraryFontsScope === 'fontsource') {
      setSavedLibraryFontsScope('dynamic');
    }
  }, [savedLibraryFontsScope]);

  const libraryTabs = useMemo(
    () => [
      ...LIBRARY_MAIN_TABS,
      ...fontLibraries.map((library) => ({
        id: makeSavedLibraryTabId(library.id),
        label: library.name,
      })),
    ],
    [fontLibraries],
  );

  const activeSavedLibrary = useMemo(() => {
    const libraryId = readSavedLibraryId(fontsLibraryTab);
    if (!libraryId) return null;
    return fontLibraries.find((library) => library.id === libraryId) || null;
  }, [fontLibraries, fontsLibraryTab]);

  const savedLibraryHasAdvancedFilters =
    (Array.isArray(savedLibraryFilterSubsets) && savedLibraryFilterSubsets.length > 0) ||
    String(savedLibraryFilterVariable || 'all') !== 'all' ||
    savedLibraryFilterItalic === true;

  const resetSavedLibraryFilters = useCallback(() => {
    setSavedLibraryFontsScope('all');
    resetSavedLibrarySearch();
    setSavedLibraryFilterSubsets([]);
    setSavedLibraryFilterVariable('all');
    setSavedLibraryFilterItalic(false);
  }, [resetSavedLibrarySearch]);

  const savedLibraryCardMetaClassName = 'mt-auto pt-1 text-xs font-semibold uppercase text-gray-800';

  const activeSavedLibraryScopeCounts = useMemo(
    () => countFontsByScope(activeSavedLibrary?.fonts || []),
    [activeSavedLibrary],
  );

  const activeSavedLibraryScopeOptions = useMemo(
    () => buildScopeSelectOptions(activeSavedLibraryScopeCounts),
    [activeSavedLibraryScopeCounts],
  );

  return {
    savedLibraryFontsScope,
    setSavedLibraryFontsScope,
    savedLibraryFilterSubsets,
    setSavedLibraryFilterSubsets,
    savedLibraryFilterVariable,
    setSavedLibraryFilterVariable,
    savedLibraryFilterItalic,
    setSavedLibraryFilterItalic,
    savedLibraryVariableOptions: SAVED_LIBRARY_VARIABLE_OPTIONS,
    savedLibraryHasAdvancedFilters,
    resetSavedLibraryFilters,
    savedLibraryCardMetaClassName,
    libraryTabs,
    activeSavedLibrary,
    activeSavedLibraryScopeCounts,
    activeSavedLibraryScopeOptions,
  };
}
