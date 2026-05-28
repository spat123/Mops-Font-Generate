'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/** Web Analytics + Speed Insights — только на хостинге Vercel (не ONREZA/VPS). */
function isVercelHosting() {
  if (process.env.NEXT_PUBLIC_VERCEL === '1' || process.env.VERCEL === '1') return true;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return host.endsWith('.vercel.app');
  }
  return false;
}

export function VercelObservability() {
  if (!isVercelHosting()) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
