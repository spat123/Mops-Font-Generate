/**
 * Debounce с методом cancel() (как у lodash.debounce).
 */
export function debounce(func, wait = 50) {
  let timeout;
  function debounced(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  }
  debounced.cancel = () => {
    clearTimeout(timeout);
  };
  return debounced;
}
