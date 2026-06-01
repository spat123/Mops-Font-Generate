import {
  parseFontfabricTrialEntrySlug,
  parseFontshareEntrySlug,
  parseFontsourceEntrySlug,
  parseGoogleEntryFamily,
} from './catalogCacheLookup';
import type { SavedLibraryFontEntry, SavedLibraryFontEntryInput } from '../types/savedLibrary';

type LibraryEntryLike = Partial<Pick<SavedLibraryFontEntryInput, 'id' | 'label' | 'source' | 'candidateIds' | 'candidateLabels'>>;

export type LibraryFontIdentity = {
  source: string;
  id: string;
  label: string;
  sourceKey: string;
  familyKey: string;
  catalogKey: string;
  catalogValue: string;
};

export function normalizeLibraryIdentityText(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeLibraryFamilyKey(value: unknown): string {
  return normalizeLibraryIdentityText(value)
    .replace(/\.woff2$/i, '')
    .replace(/\s+variable$/i, '')
    .replace(/\s+\d+$/i, '')
    .trim()
    .toLowerCase();
}

export function resolveLibraryFontIdentity(entry: LibraryEntryLike | null | undefined): LibraryFontIdentity | null {
  if (!entry) return null;
  const id = String(entry.id || '').trim();
  const source = String(entry.source || '').trim().toLowerCase();
  const label = normalizeLibraryIdentityText(entry.label);
  if (!source && !id && !label) return null;

  let catalogValue = '';
  if (source === 'google') catalogValue = parseGoogleEntryFamily(id) || label;
  else if (source === 'fontsource') catalogValue = parseFontsourceEntrySlug(id);
  else if (source === 'fontshare') catalogValue = parseFontshareEntrySlug(id);
  else if (source === 'fontfabric-trial') catalogValue = parseFontfabricTrialEntrySlug(id);
  else catalogValue = id.replace(/^session:/i, '') || label;
  catalogValue = normalizeLibraryIdentityText(catalogValue);

  const sourceKey = source && catalogValue ? `${source}:${catalogValue.toLowerCase()}` : '';
  const familyKey = normalizeLibraryFamilyKey(label || catalogValue);
  const catalogKey = sourceKey || (source && id ? `${source}:${id.toLowerCase()}` : familyKey);

  return {
    source,
    id,
    label,
    sourceKey,
    familyKey,
    catalogKey,
    catalogValue,
  };
}

export function libraryFontIdentitiesMatch(
  a: LibraryEntryLike | null | undefined,
  b: LibraryEntryLike | null | undefined,
): boolean {
  const left = resolveLibraryFontIdentity(a);
  const right = resolveLibraryFontIdentity(b);
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;
  if (left.sourceKey && right.sourceKey && left.sourceKey === right.sourceKey) return true;
  return Boolean(left.familyKey && right.familyKey && left.familyKey === right.familyKey);
}

export function getLibraryEntryCatalogIdentityKey(entry: LibraryEntryLike | null | undefined): string | null {
  const identity = resolveLibraryFontIdentity(entry);
  return identity?.sourceKey || identity?.catalogKey || null;
}

export function libraryEntryMatchesInput(
  item: SavedLibraryFontEntry | null | undefined,
  input: LibraryEntryLike | null | undefined,
): boolean {
  if (!item || !input) return false;
  const itemId = String(item.id || '').trim();
  const inputId = String(input.id || '').trim();
  if (itemId && inputId && itemId === inputId) return true;

  const candidateIds = Array.isArray(input.candidateIds)
    ? input.candidateIds.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  if (itemId && candidateIds.includes(itemId)) return true;
  if (libraryFontIdentitiesMatch(item, input)) return true;

  const itemSource = String(item.source || '').trim();
  const itemFamilyKey = normalizeLibraryFamilyKey(item.label);
  const candidateLabels = Array.isArray(input.candidateLabels)
    ? input.candidateLabels.map((value) => normalizeLibraryFamilyKey(value)).filter(Boolean)
    : [];
  return Boolean(
    itemSource &&
      input.source &&
      itemSource === String(input.source).trim() &&
      itemFamilyKey &&
      candidateLabels.includes(itemFamilyKey),
  );
}
