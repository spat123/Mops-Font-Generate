export type SessionJsonCache<T> = {
  read: () => T[];
  write: (items: T[]) => void;
  clear: () => void;
};

export function createSessionJsonCache<T>({
  key,
  isValid,
}: {
  key: string;
  isValid: (value: unknown) => value is T[];
}): SessionJsonCache<T> {
  function read(): T[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return isValid(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function write(items: T[]): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(items));
    } catch {
      /* квота / приватный режим */
    }
  }

  function clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  return { read, write, clear };
}
