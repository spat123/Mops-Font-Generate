import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Set с авто-удалением ключей по таймеру (sticky "recently added").
 * Используется, чтобы карточка оставалась видимой/подсвеченной немного дольше.
 */
export function useStickyTimedSet(defaultVisibleMs = 900) {
  const [set, setSet] = useState(() => new Set());
  const timersRef = useRef(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, []);

  const mark = useCallback(
    (key, stickyMs = defaultVisibleMs) => {
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

