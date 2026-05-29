import {
  clearAllKnownCaches,
  clearEditorShellCache,
  clearFontUiCache,
  clearFontsourceVariableSettingsCache,
  clearSessionPreviewCache,
} from './appCacheControl';

declare global {
  // eslint-disable-next-line no-var
  var __DEBUG_CACHE_COMMANDS__: boolean | undefined;
  interface Window {
    __DEBUG_CACHE_COMMANDS__?: boolean;
    __DF_CACHE__?: Record<string, unknown>;
  }
}

function shouldInstall(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.__DEBUG_CACHE_COMMANDS__ === true) return true;
  } catch {
    // ignore
  }
  try {
    const v = window.localStorage?.getItem('debugCacheCommands');
    if (v === '1' || v === 'true' || v === 'on') return true;
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== 'production';
}

/**
 * Устанавливает команды для консоли:
 * - `window.__DF_CACHE__.clearAllKnownCaches()`
 * - `window.__DF_CACHE__.clearFontsourceVariableSettingsCache()`
 * и т.д.
 */
export function installAppCacheConsoleCommands(): void {
  if (!shouldInstall()) return;
  if (typeof window === 'undefined') return;
  const api = {
    clearAllKnownCaches,
    clearFontUiCache,
    clearFontsourceVariableSettingsCache,
    clearEditorShellCache,
    clearSessionPreviewCache,
  };
  try {
    window.__DF_CACHE__ = api;
  } catch {
    // noop
  }
}

