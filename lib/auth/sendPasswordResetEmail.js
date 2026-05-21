import { Resend } from 'resend';
import { wrapAuthEmailHtml } from './emailBranding';

function getFromAddress() {
  const from = String(process.env.EMAIL_FROM || '').trim();
  if (from) return from;
  return 'DINAMIC FONT <onboarding@resend.dev>';
}

function buildResetUrl(token) {
  const base = String(process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const email = String(to || '').trim().toLowerCase();
  if (!email || !token) throw Object.assign(new Error('Invalid email payload'), { code: 'VALIDATION' });

  const resetUrl = buildResetUrl(token);
  const displayName = String(name || '').trim() || 'пользователь';
  const subject = 'Сброс пароля — DINAMIC FONT';
  const text = `Сброс пароля DINAMIC FONT\n\nЗдравствуйте, ${displayName}!\n\nПерейдите по ссылке, чтобы задать новый пароль:\n${resetUrl}\n\nСсылка действует 1 час. Если вы не запрашивали сброс — проигнорируйте письмо.`;
  const html = wrapAuthEmailHtml(`
    <p>Здравствуйте, ${displayName}!</p>
    <p>Вы запросили сброс пароля для DINAMIC FONT. Нажмите кнопку ниже, чтобы задать новый пароль:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#111827;color:#fff;text-decoration:none;font-size:13px;font-weight:600;border-radius:8px">Сбросить пароль</a>
    </p>
    <p style="font-size:12px;color:#6b7280">Ссылка действует 1 час. Если кнопка не открывается, скопируйте адрес:<br/><a href="${resetUrl}" style="color:#6b7280;word-break:break-all">${resetUrl}</a></p>
    <p style="font-size:12px;color:#6b7280">Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
  `);

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.info('[auth/password-reset] RESEND_API_KEY не задан — письмо в консоль (dev):');
    console.info(`  To: ${email}`);
    console.info(`  ${resetUrl}`);
    return { dev: true, resetUrl };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: [email],
    subject,
    html,
    text,
  });
  if (error) {
    console.error('[auth/password-reset] Resend error:', error);
    throw Object.assign(new Error('Email send failed'), { code: 'EMAIL_FAILED' });
  }
  return { dev: false };
}
