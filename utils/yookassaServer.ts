import { legalMeta } from '../config/legal';

export type YooKassaCredentials = {
  shopId: string;
  secretKey: string;
};

export function getYooKassaCredentials(): YooKassaCredentials | null {
  const shopId = String(process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = String(process.env.YOOKASSA_SECRET_KEY || '').trim();
  if (!shopId || !secretKey) return null;
  return { shopId, secretKey };
}

export function isYooKassaConfigured(): boolean {
  return getYooKassaCredentials() != null;
}

function getSiteOrigin(): string {
  return (
    String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || legalMeta.siteUrl)
      .trim()
      .replace(/\/$/, '') || legalMeta.siteUrl
  );
}

function authHeader(credentials: YooKassaCredentials): string {
  const token = Buffer.from(`${credentials.shopId}:${credentials.secretKey}`).toString('base64');
  return `Basic ${token}`;
}

function formatAmountValue(amountRub: number): string {
  return amountRub.toFixed(2);
}

export type CreateYooKassaPaymentResult = {
  paymentId: string;
  confirmationUrl: string;
};

export async function createYooKassaPayment(amountRub: number): Promise<CreateYooKassaPaymentResult> {
  const credentials = getYooKassaCredentials();
  if (!credentials) {
    throw new Error('YooKassa is not configured');
  }

  const idempotenceKey = crypto.randomUUID();
  const returnUrl = `${getSiteOrigin()}/support/thank-you`;

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      Authorization: authHeader(credentials),
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: formatAmountValue(amountRub),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description: `Добровольная поддержка ${legalMeta.serviceName}`,
      metadata: {
        purpose: 'donation',
      },
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const description = String(payload.description || payload.type || 'YooKassa API error');
    throw new Error(description);
  }

  const paymentId = String(payload.id || '');
  const confirmation = payload.confirmation as { confirmation_url?: string } | undefined;
  const confirmationUrl = String(confirmation?.confirmation_url || '');
  if (!paymentId || !confirmationUrl) {
    throw new Error('Invalid YooKassa response');
  }

  return { paymentId, confirmationUrl };
}

export async function fetchYooKassaPayment(paymentId: string): Promise<Record<string, unknown> | null> {
  const credentials = getYooKassaCredentials();
  if (!credentials) return null;

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: authHeader(credentials),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as Record<string, unknown>;
}
