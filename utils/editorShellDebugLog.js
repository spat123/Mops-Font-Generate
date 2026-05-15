/**
 * Диагностика вкладок редактора / skeleton после F5.
 *
 * Включение:
 * - `window.__DEBUG_EDITOR_SHELL__ = true`
 * - или `localStorage.setItem('debugEditorShell', '1')` и перезагрузка
 */
export function isEditorShellDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.__DEBUG_EDITOR_SHELL__ === true) return true;
  } catch {
    // ignore
  }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('debugEditorShell') === '1') return true;
  } catch {
    // ignore
  }
  return false;
}

export function editorShellDbg(label, payload = {}) {
  if (!isEditorShellDebugEnabled()) return;
  try {
    console.log('[editorShell]', label, payload);
  } catch {
    // ignore
  }
}
