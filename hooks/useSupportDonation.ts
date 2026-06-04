import { useCallback, useEffect, useState } from 'react';
import { getPrimaryProjectSupportLink, startSupportDonation } from '../utils/projectSupport';

export function useSupportDonation() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(
    () => getPrimaryProjectSupportLink()?.label ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    void fetch('/api/support/yookassa/status')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { enabled?: boolean } | null) => {
        if (cancelled || !data?.enabled) return;
        const label = String(process.env.NEXT_PUBLIC_SUPPORT_YOOKASSA_LABEL || '').trim() || 'ЮKassa';
        setProviderLabel(label);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const donate = useCallback(async (amountRub: number): Promise<boolean> => {
    if (!Number.isFinite(amountRub) || amountRub <= 0) return false;

    setIsSubmitting(true);
    setError(null);

    try {
      await startSupportDonation(amountRub);
      return true;
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Не удалось начать оплату');
      return false;
    }
  }, []);

  return { donate, isSubmitting, error, providerLabel };
}
