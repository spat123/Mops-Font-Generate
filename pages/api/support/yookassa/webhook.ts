import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchYooKassaPayment, isYooKassaConfigured } from '../../../../utils/yookassaServer';

type YooKassaWebhookBody = {
  event?: unknown;
  object?: {
    id?: unknown;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  if (!isYooKassaConfigured()) {
    return res.status(503).end();
  }

  const body = req.body as YooKassaWebhookBody | undefined;
  if (!body || typeof body !== 'object') {
    return res.status(400).end();
  }

  const event = String(body.event || '');
  const paymentId = String(body.object?.id || '');
  if (!paymentId) {
    return res.status(400).end();
  }

  const payment = await fetchYooKassaPayment(paymentId);
  if (!payment) {
    return res.status(200).end();
  }

  const metadata = payment.metadata as Record<string, unknown> | undefined;
  const purpose = String(metadata?.purpose || '');
  if (purpose && purpose !== 'donation') {
    return res.status(200).end();
  }

  const status = String(payment.status || '');
  if (event === 'payment.succeeded' && status === 'succeeded') {
    const amount = payment.amount as { value?: string; currency?: string } | undefined;
    console.info('[yookassa/webhook] donation succeeded', {
      paymentId,
      amount: amount?.value,
      currency: amount?.currency,
    });
  } else if (event === 'payment.canceled' || status === 'canceled') {
    console.info('[yookassa/webhook] donation canceled', { paymentId });
  }

  return res.status(200).end();
}
