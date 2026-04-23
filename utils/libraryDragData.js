const LIBRARY_FONT_DRAG_MIME = 'application/x-mops-library-font';

export function writeLibraryFontDragData(dataTransfer, fontEntry) {
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

export function readLibraryFontDragData(dataTransfer) {
  if (!dataTransfer) return null;
  try {
    const raw = dataTransfer.getData(LIBRARY_FONT_DRAG_MIME);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const id = String(parsed.id || '').trim();
    const label = String(parsed.label || '').trim();
    const source = String(parsed.source || 'session').trim();
    if (!id || !label) return null;
    return { id, label, source };
  } catch {
    return null;
  }
}

export function hasLibraryFontDragData(dataTransfer) {
  return Boolean(readLibraryFontDragData(dataTransfer));
}
