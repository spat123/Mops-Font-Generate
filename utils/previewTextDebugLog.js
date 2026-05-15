/**
 * Диагностика текста превью после F5.
 *
 * Включение:
 * - в консоли: `window.__DEBUG_PREVIEW_TEXT__ = true`
 * - или: `localStorage.setItem('debugPreviewText', '1')` и перезагрузка
 *
 * Выключение:
 * - `window.__DEBUG_PREVIEW_TEXT__ = false`
 * - `localStorage.removeItem('debugPreviewText')`
 */
export function isPreviewTextDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.__DEBUG_PREVIEW_TEXT__ === true) return true;
  } catch {
    // ignore
  }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('debugPreviewText') === '1') return true;
  } catch {
    // ignore
  }
  return false;
}

export function previewTextDbg(label, payload = {}) {
  if (!isPreviewTextDebugEnabled()) return;
  try {
    console.log('[previewText]', label, payload);
  } catch {
    // ignore
  }
}

export function previewTextSnippet(value, max = 80) {
  const s = typeof value === 'string' ? value : String(value ?? '');
  const oneLine = s.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}
