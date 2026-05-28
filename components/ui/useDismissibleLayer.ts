import { useEffect, type RefObject } from 'react';

export type UseDismissibleLayerOptions = {
  open: boolean;
  refs?: Array<RefObject<HTMLElement | null>>;
  onDismiss?: () => void;
  closeOnEscape?: boolean;
  pointerEventName?: string;
};

export function useDismissibleLayer({
  open,
  refs = [],
  onDismiss,
  closeOnEscape = true,
  /**
   * ВАЖНО: используем `click`, а не `mousedown`.
   * Если закрывать слой на `mousedown`, первый клик по элементу под ним может "теряться":
   * слой размонтируется до того, как сработает `onClick` цели.
   */
  pointerEventName = 'click',
}: UseDismissibleLayerOptions) {
  useEffect(() => {
    if (!open) return undefined;

    const isInsideLayer = (target: EventTarget | null) =>
      refs.some((ref) => {
        const node = ref?.current;
        return Boolean(node?.contains?.(target as Node));
      });

    const handleOutsideEvent = (event: Event) => {
      if (isInsideLayer(event.target)) return;
      onDismiss?.();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== 'Escape') return;
      onDismiss?.();
    };

    document.addEventListener(pointerEventName, handleOutsideEvent);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener(pointerEventName, handleOutsideEvent);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, onDismiss, open, pointerEventName, refs]);
}
