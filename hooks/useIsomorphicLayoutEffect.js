import { useEffect, useLayoutEffect } from 'react';

/**
 * На сервере (SSR) `useLayoutEffect` не выполняется и даёт предупреждение React.
 * В браузере — обычный layout-effect (до paint).
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
