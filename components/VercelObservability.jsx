'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/** Web Analytics + Speed Insights (только клиент, production на Vercel). */
export function VercelObservability() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
