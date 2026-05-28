import type { SavedLibraryFontEntry } from '../types/savedLibrary';

const LIBRARY_FONT_DRAG_MIME = 'application/x-dinamic-font-library-font';

export type LibraryFontDragPayload = Pick<SavedLibraryFontEntry, 'id' | 'label' | 'source'>;

export function writeLibraryFontDragData(
  dataTransfer: DataTransfer | null | undefined,
  fontEntry: SavedLibraryFontEntry | null | undefined,
): boolean {
  if (!dataTransfer || !fontEntry) return false;
  try {
    const payload = JSON.stringify({
      id: String(fontEntry.id || ''),
      label: String(fontEntry.label || ''),
      source: String(fontEntry.source || 'session'),
    });
    dataTransfer.effectAllowed = 'copy';
    dataTransfer.setData(LIBRARY_FONT_DRAG_MIME, payload);
    dataTransfer.setData('text/plain', String(fontEntry.label || fontEntry.id || 'font'));
    return true;
  } catch {
    return false;
  }
}

export function readLibraryFontDragData(
  dataTransfer: DataTransfer | null | undefined,
): LibraryFontDragPayload | null {
  if (!dataTransfer) return null;
  try {
    const raw = dataTransfer.getData(LIBRARY_FONT_DRAG_MIME);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const row = parsed as Record<string, unknown>;
    const id = String(row.id || '').trim();
    const label = String(row.label || '').trim();
    const source = String(row.source || 'session').trim();
    if (!id || !label) return null;
    return { id, label, source };
  } catch {
    return null;
  }
}

export function hasLibraryFontDragData(dataTransfer: DataTransfer | null | undefined): boolean {
  return Boolean(readLibraryFontDragData(dataTransfer));
}
