export function createSessionJsonCache({ key, isValid }) {
  function read() {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return isValid(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* квота / приватный режим */
    }
  }

  function clear() {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  return { read, write, clear };
}
