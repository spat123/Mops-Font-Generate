import { useEffect } from 'react';

export function useDismissibleLayer({
  open,
  refs = [],
  onDismiss,
  closeOnEscape = true,
  pointerEventName = 'mousedown',
}) {
  useEffect(() => {
    if (!open) return undefined;

    const isInsideLayer = (target) =>
      refs.some((ref) => {
        const node = ref?.current;
        return Boolean(node?.contains?.(target));
      });

    const handlePointerDown = (event) => {
      if (isInsideLayer(event.target)) return;
      onDismiss?.();
    };

    const handleKeyDown = (event) => {
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
