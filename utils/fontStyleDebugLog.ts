type DebugPayload = Record<string, unknown> | null | undefined;

const LS_KEY = 'debugFontStyle';

export function isFontStyleDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = window.localStorage?.getItem(LS_KEY);
    if (!v) return false;
    return v === '1' || v === 'true' || v === 'on' || v === 'yes';
  } catch {
    return false;
  }
}

export function fontStyleDbg(message: string, payload?: DebugPayload): void {
  if (!isFontStyleDebugEnabled()) return;
  try {
    const ts = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    if (payload && typeof payload === 'object') {
      // eslint-disable-next-line no-console
      console.log(`[FontStyle ${ts}] ${message}`, payload);
      return;
    }
    // eslint-disable-next-line no-console
    console.log(`[FontStyle ${ts}] ${message}`);
  } catch {
    // ignore
  }
}

