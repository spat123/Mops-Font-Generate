import { useEffect } from 'react';
import type { NextRouter } from 'next/router';

/** Старые ссылки `/?share=` и `/?id=` → `/share`. */
export function useShareRouteRedirect(router: NextRouter): void {
  useEffect(() => {
    if (!router.isReady) return;
    const rawShare = router.query.share;
    const share = typeof rawShare === 'string' ? rawShare : Array.isArray(rawShare) ? rawShare[0] : '';
    const rawId = router.query.id;
    const shareId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
    if (shareId) {
      void router.replace({ pathname: '/share', query: { id: shareId } });
      return;
    }
    if (!share) return;
    void router.replace({ pathname: '/share', query: { share } });
  }, [router.isReady, router.query.share, router.query.id, router]);
}
