import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Set с авто-удалением ключей по таймеру (sticky "recently added").
 * Используется, чтобы карточка оставалась видимой/подсвеченной немного дольше.
 */
export function useStickyTimedSet(defaultVisibleMs = 900) {
  const [set, setSet] = useState(() => new Set<string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const mark = useCallback(
    (key: string, stickyMs = defaultVisibleMs) => {
      if (!key) return;
      setSet((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      const existingTimer = timersRef.current.get(key);
      if (existingTimer) clearTimeout(existingTimer);
      const timerId = setTimeout(() => {
        setSet((prev) => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        timersRef.current.delete(key);
      }, stickyMs);
      timersRef.current.set(key, timerId);
    },
    [defaultVisibleMs],
  );

  return { set, mark };
}
