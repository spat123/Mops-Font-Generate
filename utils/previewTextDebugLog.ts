/**
 * Диагностика текста превью после F5.
 *
 * Включение:
 * - в консоли: `window.__DEBUG_PREVIEW_TEXT__ = true`
 * - или: `localStorage.setItem('debugPreviewText', '1')` и перезагрузка
 */
export function isPreviewTextDebugEnabled(): boolean {
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

export function previewTextDbg(label: string, payload: Record<string, unknown> = {}): void {
  if (!isPreviewTextDebugEnabled()) return;
  try {
    console.log('[previewText]', label, payload);
  } catch {
    // ignore
  }
}

export function previewTextSnippet(value: unknown, max = 80): string {
  const s = typeof value === 'string' ? value : String(value ?? '');
  const oneLine = s.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

declare global {
  interface Window {
    __DEBUG_PREVIEW_TEXT__?: boolean;
  }
}

export {};
