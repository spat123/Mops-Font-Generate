import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
} from 'react';

export type UseLongPressMultiSelectParams = {
  longPressMs?: number;
  isInteractiveTarget?: (target: EventTarget | null) => boolean;
};

/**
 * Единая логика для ROW/GRID каталога:
 * - long press (touch/pen/mouse) переключает выделение
 * - если есть выделение, клик по карточке переключает выделение
 * - клик по интерактивным элементам карточки не должен менять выделение
 */
export function useLongPressMultiSelect({
  longPressMs = 220,
  isInteractiveTarget,
}: UseLongPressMultiSelectParams = {}) {
  const [selectedKeys, setSelectedKeys] = useState(() => new Set<string>());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLongPressTimer();
  }, [clearLongPressTimer]);

  const toggleSelectedKey = useCallback((key: string) => {
    if (!key) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const startLongPress = useCallback(
    (event: MouseEvent | TouchEvent, key: string) => {
      if (typeof isInteractiveTarget === 'function' && isInteractiveTarget(event?.target)) return;
      clearLongPressTimer();
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        toggleSelectedKey(key);
      }, longPressMs);
    },
    [clearLongPressTimer, isInteractiveTarget, longPressMs, toggleSelectedKey],
  );

  const onCardClick = useCallback(
    (event: MouseEvent, key: string) => {
      if (typeof isInteractiveTarget === 'function' && isInteractiveTarget(event?.target)) return;
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        event?.preventDefault?.();
        return;
      }
      if (selectedKeys.size > 0) {
        event?.preventDefault?.();
        toggleSelectedKey(key);
      }
    },
    [isInteractiveTarget, selectedKeys.size, toggleSelectedKey],
  );

  const pruneSelection = useCallback((visibleKeys: Set<string>) => {
    setSelectedKeys((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<string>();
      prev.forEach((k) => {
        if (visibleKeys.has(k)) next.add(k);
      });
      return next.size === prev.size ? prev : next;
    });
  }, []);

  return {
    selectedKeys,
    setSelectedKeys: setSelectedKeys as Dispatch<SetStateAction<Set<string>>>,
    toggleSelectedKey,
    startLongPress,
    onCardClick,
    clearLongPressTimer,
    pruneSelection,
  };
}
