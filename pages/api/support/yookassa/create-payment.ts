import type { NextApiRequest, NextApiResponse } from 'next';
import { createYooKassaPayment, isYooKassaConfigured } from '../../../../utils/yookassaServer';

const MIN_AMOUNT_RUB = 1;
const MAX_AMOUNT_RUB = 300_000;

type CreatePaymentBody = {
  amountRub?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isYooKassaConfigured()) {
    return res.status(503).json({ error: 'YooKassa is not configured' });
  }

  const body = (req.body ?? {}) as CreatePaymentBody;
  const amountRub = Number(body.amountRub);
  if (
    !Number.isFinite(amountRub) ||
    !Number.isInteger(amountRub) ||
    amountRub < MIN_AMOUNT_RUB ||
    amountRub > MAX_AMOUNT_RUB
  ) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const result = await createYooKassaPayment(amountRub);
    return res.status(200).json({
      paymentId: result.paymentId,
      confirmationUrl: result.confirmationUrl,
    });
  } catch (error) {
    console.error('[yookassa/create-payment]', error);
    const message = error instanceof Error ? error.message : 'Payment creation failed';
    return res.status(502).json({ error: message });
  }
}
