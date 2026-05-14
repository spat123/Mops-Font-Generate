import React from 'react';
import { countRecentlyAddedLibraryFonts } from './fontLibraryUtils';
import { LIBRARY_FONT_SCOPE_TABS } from '../constants/fontsLibraryScreen';

export function countFontsByScope(fonts) {
  const list = Array.isArray(fonts) ? fonts : [];
  return {
    all: list.length,
    recent: countRecentlyAddedLibraryFonts(list),
    local: list.filter((font) => (font?.source || 'local') === 'local').length,
    google: list.filter((font) => font?.source === 'google').length,
    fontsource: list.filter((font) => font?.source === 'fontsource').length,
  };
}

export function buildScopeSelectOptions(counts) {
  return LIBRARY_FONT_SCOPE_TABS.map((tab) => ({
    value: tab.id,
    label: (
      <span className="flex w-full items-center justify-between gap-3">
        <span className="truncate">{tab.label}</span>
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-50 text-[10px] tabular-nums leading-none text-gray-800 transition-colors group-hover:bg-white group-hover:text-accent">
          {counts?.[tab.id] ?? 0}
        </span>
      </span>
    ),
    triggerLabel: tab.label,
  }));
}
