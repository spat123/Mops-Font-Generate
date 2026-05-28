import type { LibraryFontScopeId } from '../constants/fontsLibraryScreen';
import { LIBRARY_FONT_SCOPE_TABS } from '../constants/fontsLibraryScreen';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';
import {
  countRecentlyAddedLibraryFonts,
  isDynamicLibraryFontSource,
  isLocalLibraryFontSource,
} from './fontLibraryUtils';

export type LibraryFontScopeCounts = Record<LibraryFontScopeId, number>;

export type ScopeSelectOption = {
  value: LibraryFontScopeId;
  label: string;
  triggerLabel: string;
  rightLabel: string;
};

export function countFontsByScope(fonts: SavedLibraryFontEntry[] | null | undefined): LibraryFontScopeCounts {
  const list = Array.isArray(fonts) ? fonts : [];
  return {
    all: list.length,
    recent: countRecentlyAddedLibraryFonts(list),
    local: list.filter((font) => isLocalLibraryFontSource(font?.source)).length,
    dynamic: list.filter((font) => isDynamicLibraryFontSource(font?.source)).length,
  };
}

export function buildScopeSelectOptions(counts: Partial<LibraryFontScopeCounts> | null | undefined): ScopeSelectOption[] {
  return LIBRARY_FONT_SCOPE_TABS.map((tab) => {
    const n = counts?.[tab.id] ?? 0;
    return {
      value: tab.id,
      label: tab.label,
      triggerLabel: tab.label,
      rightLabel: String(n),
    };
  });
}
