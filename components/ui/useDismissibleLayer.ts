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
  pointerEventName = 'mousedown',
}: UseDismissibleLayerOptions) {
  useEffect(() => {
    if (!open) return undefined;

    const isInsideLayer = (target: EventTarget | null) =>
      refs.some((ref) => {
        const node = ref?.current;
        return Boolean(node?.contains?.(target as Node));
      });

    const handlePointerDown = (event: Event) => {
      if (isInsideLayer(event.target)) return;
      onDismiss?.();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape || event.key !== 'Escape') return;
      onDismiss?.();
    };

    document.addEventListener(pointerEventName, handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener(pointerEventName, handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, onDismiss, open, pointerEventName, refs]);
}
