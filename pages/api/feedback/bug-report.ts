import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { Resend } from 'resend';
import { legalMeta } from '../../../config/legal';

const MAX_SUBJECT_LENGTH = 140;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

type AttachmentPayload = {
  name?: string;
  type?: string;
  size?: number;
  contentBase64?: string;
};

type BugReportBody = {
  subject?: string;
  message?: string;
  pageUrl?: string;
  attachment?: AttachmentPayload | null;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '6mb',
    },
  },
};

function escapeHtml(value: unknown): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value || '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .slice(0, maxLength);
}

function normalizeAttachment(input: AttachmentPayload | null | undefined) {
  if (!input?.contentBase64) return null;
  const contentBase64 = String(input.contentBase64 || '').replace(/\s/g, '');
  const size = Number(input.size || 0);
  if (!contentBase64 || !Number.isFinite(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES) {
    return null;
  }
  return {
    filename: String(input.name || 'attachment').slice(0, 180),
    content: contentBase64,
    contentType: String(input.type || 'application/octet-stream').slice(0, 120),
  };
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return forwarded || String(req.socket.remoteAddress || 'unknown');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as BugReportBody;
  const subject = normalizeText(body.subject, MAX_SUBJECT_LENGTH);
  const message = normalizeText(body.message, MAX_MESSAGE_LENGTH);
  const pageUrl = normalizeText(body.pageUrl, 500);
  if (subject.length < 3 || message.length < 10) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userEmail = normalizeText(token?.email, 180) || 'guest';
  const userName = normalizeText(token?.name, 180);
  const userId = normalizeText(token?.userId, 180);
  const userAgent = normalizeText(req.headers['user-agent'], 500);
  const attachment = normalizeAttachment(body.attachment);
  const sentAt = new Date().toISOString();
  const supportEmail = legalMeta.supportEmail;

  const html = `
    <h1>Сообщение об ошибке DINAMIC FONT</h1>
    <p><strong>Тема:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Пользователь:</strong> ${escapeHtml(userName || userEmail)} (${escapeHtml(userEmail)})</p>
    ${userId ? `<p><strong>User ID:</strong> ${escapeHtml(userId)}</p>` : ''}
    <p><strong>Страница:</strong> ${escapeHtml(pageUrl || 'не указана')}</p>
    <p><strong>IP:</strong> ${escapeHtml(getClientIp(req))}</p>
    <p><strong>User-Agent:</strong> ${escapeHtml(userAgent || 'не указан')}</p>
    <p><strong>Время:</strong> ${escapeHtml(sentAt)}</p>
    <hr />
    <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${escapeHtml(message)}</pre>
  `;
  const text = [
    'Сообщение об ошибке DINAMIC FONT',
    `Тема: ${subject}`,
    `Пользователь: ${userName || userEmail} (${userEmail})`,
    userId ? `User ID: ${userId}` : '',
    `Страница: ${pageUrl || 'не указана'}`,
    `IP: ${getClientIp(req)}`,
    `User-Agent: ${userAgent || 'не указан'}`,
    `Время: ${sentAt}`,
    '',
    message,
  ]
    .filter(Boolean)
    .join('\n');

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.info('[bug-report] RESEND_API_KEY не задан — сообщение в консоль (dev):');
    console.info(text);
    if (attachment) console.info(`[bug-report] attachment: ${attachment.filename}`);
    return res.status(200).json({ ok: true, dev: true });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: String(process.env.EMAIL_FROM || '').trim() || 'DINAMIC FONT <onboarding@resend.dev>',
    to: [supportEmail],
    subject: `Bug report: ${subject}`,
    html,
    text,
    attachments: attachment ? [attachment] : undefined,
  });

  if (error) {
    console.error('[bug-report] Resend error:', error);
    return res.status(500).json({ error: 'Email send failed' });
  }

  return res.status(200).json({ ok: true });
}
