import { readFontsourceCatalogCache } from './fontsourceCatalogCache';
import { readGoogleFontCatalogCache } from './googleFontCatalogCache';
import {
  createCatalogLibraryEntry,
  mapSessionFontsToLibraryEntries,
} from './fontLibraryUtils';
import {
  getLibraryEntryCatalogIdentityKey,
  normalizeLibraryFamilyKey,
  normalizeLibraryIdentityText,
  resolveLibraryFontIdentity,
} from './libraryFontIdentity';
import { parseFontsourceEntrySlug, parseGoogleEntryFamily } from './catalogCacheLookup';
import { matchesCatalogFontSearch, matchesSearch } from './searchMatching';
import type { SessionFontRecord } from '../types/editorFonts';
import type { SavedLibraryFontEntry } from '../types/savedLibrary';
import type { SavedLibraryCatalogSearchRow } from '../types/savedLibraryCard';

const LIBRARY_PICKER_SEARCH_LIMIT = 60;

export type LibraryPickerCatalogIndex = {
  preferredEntries: SavedLibraryFontEntry[];
  fontsourceByFamilyKey: Map<string, SavedLibraryFontEntry>;
  fontsourceRawByFamilyKey: Map<string, Record<string, unknown>>;
  fontsourceRawBySlug: Map<string, Record<string, unknown>>;
  googleByFamilyKey: Map<string, SavedLibraryFontEntry>;
  googleRawByFamilyKey: Map<string, Record<string, unknown>>;
};

function familyKey(value: unknown): string {
  return normalizeLibraryFamilyKey(value);
}

function entryFamilyKey(entry: Pick<SavedLibraryFontEntry, 'id' | 'label' | 'source'> | null | undefined): string {
  return resolveLibraryFontIdentity(entry)?.familyKey || '';
}

function entryMatchesCatalogSearch(
  entry: SavedLibraryFontEntry,
  raw: Record<string, unknown> | null | undefined,
  query: string,
): boolean {
  return matchesCatalogFontSearch(
    [
      entry.label,
      raw?.id,
      raw?.slug,
      raw?.category,
      ...(Array.isArray(raw?.subsets) ? raw.subsets : []),
    ],
    query,
  );
}

function selectedFamilyKeys(entries: SavedLibraryFontEntry[] | null | undefined): Set<string> {
  const out = new Set<string>();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const key = entryFamilyKey(entry);
    if (key) out.add(key);
  });
  return out;
}

function familyKeyForKnownLibraryId(id: string, index: LibraryPickerCatalogIndex): string {
  if (id.startsWith('google:')) {
    return familyKey(parseGoogleEntryFamily(id));
  }
  if (id.startsWith('fontsource:')) {
    const slug = parseFontsourceEntrySlug(id);
    const raw = slug ? index.fontsourceRawBySlug.get(slug.toLowerCase()) : null;
    return familyKey(raw?.family || raw?.label || slug);
  }
  return '';
}

export function buildLibraryPickerCatalogIndex(): LibraryPickerCatalogIndex {
  const fontsourceRawByFamilyKey = new Map<string, Record<string, unknown>>();
  const fontsourceRawBySlug = new Map<string, Record<string, unknown>>();
  const fontsourceByFamilyKey = new Map<string, SavedLibraryFontEntry>();

  const fontsourceItems = readFontsourceCatalogCache();
  (Array.isArray(fontsourceItems) ? fontsourceItems : []).forEach((raw) => {
    const slug = normalizeLibraryIdentityText(raw?.id || raw?.slug);
    const family = normalizeLibraryIdentityText(raw?.family || raw?.label || slug);
    if (!slug || !family) return;

    const entry = createCatalogLibraryEntry({
      source: 'fontsource',
      key: slug,
      label: family,
      isVariable: Boolean(raw?.isVariable),
    });
    const key = familyKey(family);
    if (!entry || !key) return;

    if (!fontsourceByFamilyKey.has(key)) {
      fontsourceByFamilyKey.set(key, entry);
      fontsourceRawByFamilyKey.set(key, raw as Record<string, unknown>);
    }
    fontsourceRawBySlug.set(slug.toLowerCase(), raw as Record<string, unknown>);
  });

  const googleByFamilyKey = new Map<string, SavedLibraryFontEntry>();
  const googleRawByFamilyKey = new Map<string, Record<string, unknown>>();
  const googleItems = readGoogleFontCatalogCache();
  (Array.isArray(googleItems) ? googleItems : []).forEach((raw) => {
    const family = normalizeLibraryIdentityText(raw?.family);
    const key = familyKey(family);
    if (!family || !key) return;
    const entry = createCatalogLibraryEntry({ source: 'google', key: family, label: family });
    if (!entry) return;
    googleByFamilyKey.set(key, entry);
    googleRawByFamilyKey.set(key, raw as Record<string, unknown>);
  });

  const preferredEntries = [
    ...Array.from(fontsourceByFamilyKey.values()),
    ...Array.from(googleByFamilyKey.entries())
      .filter(([key]) => !fontsourceByFamilyKey.has(key))
      .map(([, entry]) => entry),
  ].sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), 'ru', { sensitivity: 'base' }));

  return {
    preferredEntries,
    fontsourceByFamilyKey,
    fontsourceRawByFamilyKey,
    fontsourceRawBySlug,
    googleByFamilyKey,
    googleRawByFamilyKey,
  };
}

export function readPreferredCatalogLibraryEntries(
  index: LibraryPickerCatalogIndex | null | undefined = buildLibraryPickerCatalogIndex(),
): SavedLibraryFontEntry[] {
  return index?.preferredEntries || [];
}

export function resolvePreferredLibraryPickerEntry(
  entry: SavedLibraryFontEntry | null | undefined,
  index: LibraryPickerCatalogIndex | null | undefined = buildLibraryPickerCatalogIndex(),
): SavedLibraryFontEntry | null {
  if (!entry) return null;
  const source = String(entry.source || '').trim();
  if (source === 'fontsource') return entry;

  const key = entryFamilyKey(entry);
  if ((source === 'google' || source === 'session') && key) {
    const fontsource = index?.fontsourceByFamilyKey.get(key);
    if (fontsource) return fontsource;
  }
  return entry;
}

export type NormalizeLibraryEntriesForPickerOptions = {
  /** При редактировании библиотеки не схлопывать :dup:N и разные id одного семейства. */
  dedupeFamilies?: boolean;
};

export function normalizeLibraryEntriesForPicker(
  entries: SavedLibraryFontEntry[] | null | undefined,
  index: LibraryPickerCatalogIndex | null | undefined = buildLibraryPickerCatalogIndex(),
  options: NormalizeLibraryEntriesForPickerOptions = {},
): SavedLibraryFontEntry[] {
  const dedupeFamilies = options.dedupeFamilies !== false;
  const seenFamilyKeys = new Set<string>();
  const seenIds = new Set<string>();
  const out: SavedLibraryFontEntry[] = [];

  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const preferred = resolvePreferredLibraryPickerEntry(entry, index) || entry;
    const dedupeKey = entryFamilyKey(preferred) || getLibraryEntryCatalogIdentityKey(preferred) || preferred.id;
    const id = String(preferred.id || '').trim();
    if (id && seenIds.has(id)) return;
    if (dedupeFamilies && dedupeKey && seenFamilyKeys.has(dedupeKey)) return;
    if (dedupeKey) seenFamilyKeys.add(dedupeKey);
    if (id) seenIds.add(id);
    out.push(preferred);
  });

  return out;
}

export function searchLibraryPickerCatalog({
  searchQueryTrimmed,
  selectedEntries,
  index = buildLibraryPickerCatalogIndex(),
}: {
  searchQueryTrimmed: string;
  selectedEntries?: SavedLibraryFontEntry[];
  index?: LibraryPickerCatalogIndex | null;
}): SavedLibraryFontEntry[] {
  const query = String(searchQueryTrimmed || '').trim();
  if (!query || !index) return [];

  const selectedKeys = selectedFamilyKeys(selectedEntries);
  return index.preferredEntries
    .filter((entry) => {
      const key = entryFamilyKey(entry);
      if (key && selectedKeys.has(key)) return false;
      const raw =
        entry.source === 'fontsource'
          ? index.fontsourceRawByFamilyKey.get(key)
          : index.googleRawByFamilyKey.get(key);
      return entryMatchesCatalogSearch(entry, raw, query);
    })
    .slice(0, LIBRARY_PICKER_SEARCH_LIMIT);
}

export function searchSessionLocalFontsForPicker(
  sessionFonts: SessionFontRecord[] | null | undefined,
  searchQueryTrimmed: string,
  selectedEntries: SavedLibraryFontEntry[] | null | undefined,
): SavedLibraryFontEntry[] {
  const query = String(searchQueryTrimmed || '').trim();
  if (!query) return [];

  const selectedIds = new Set((Array.isArray(selectedEntries) ? selectedEntries : []).map((entry) => entry.id));
  return mapSessionFontsToLibraryEntries(sessionFonts)
    .filter((entry) => String(entry.source || '').trim() === 'local')
    .filter((entry) => !selectedIds.has(entry.id))
    .filter((entry) => matchesSearch([entry.label, entry.id], query))
    .slice(0, 12);
}

export function searchPreferredSavedLibraryCatalog({
  searchQueryTrimmed,
  libraryFontIds,
  index = buildLibraryPickerCatalogIndex(),
}: {
  searchQueryTrimmed: string;
  libraryFontIds?: Set<string>;
  index?: LibraryPickerCatalogIndex | null;
}): SavedLibraryCatalogSearchRow[] {
  const query = String(searchQueryTrimmed || '').trim();
  if (!query || !index) return [];

  const ids = libraryFontIds instanceof Set ? libraryFontIds : new Set<string>();
  const inLibraryFamilyKeys = new Set<string>();
  ids.forEach((id) => {
    const key = familyKeyForKnownLibraryId(id, index);
    if (key) inLibraryFamilyKeys.add(key);
  });

  return index.preferredEntries
    .filter((entry) => {
      const key = entryFamilyKey(entry);
      const raw =
        entry.source === 'fontsource'
          ? index.fontsourceRawByFamilyKey.get(key)
          : index.googleRawByFamilyKey.get(key);
      return entryMatchesCatalogSearch(entry, raw, query);
    })
    .slice(0, LIBRARY_PICKER_SEARCH_LIMIT)
    .map((entry) => {
      const key = entryFamilyKey(entry);
      const alreadyInLibrary = ids.has(entry.id) || (key ? inLibraryFamilyKeys.has(key) : false);
      if (entry.source === 'fontsource') {
        const slug = parseFontsourceEntrySlug(entry.id);
        return {
          id: `catalog-fontsource:${slug}`,
          source: 'fontsource',
          slug,
          family: entry.label,
          item: index.fontsourceRawByFamilyKey.get(key),
          alreadyInLibrary,
        };
      }
      const family = parseGoogleEntryFamily(entry.id) || entry.label;
      return {
        id: `catalog-google:${family}`,
        source: 'google',
        family,
        entry: index.googleRawByFamilyKey.get(key),
        alreadyInLibrary,
      };
    });
}
