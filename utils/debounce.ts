/**
 * Debounce с методом cancel() (как у lodash.debounce).
 */
export function debounce<T extends (...args: never[]) => void>(
  func: T,
  wait = 50,
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function debounced(this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  }
  debounced.cancel = () => {
    clearTimeout(timeout);
  };
  return debounced as T & { cancel: () => void };
}
