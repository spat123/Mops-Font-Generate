import { Resend } from 'resend';
import { wrapAuthEmailHtml } from './emailBranding';

function getFromAddress() {
  const from = String(process.env.EMAIL_FROM || '').trim();
  if (from) return from;
  return 'DINAMIC FONT <onboarding@resend.dev>';
}

export async function sendLoginCodeEmail({ to, name, code }) {
  const email = String(to || '').trim().toLowerCase();
  const loginCode = String(code || '').replace(/\D/g, '').slice(0, 6);
  if (!email || loginCode.length !== 6) {
    throw Object.assign(new Error('Invalid login email payload'), { code: 'VALIDATION' });
  }

  const subject = 'Код для входа — DINAMIC FONT';
  const html = wrapAuthEmailHtml(`
    <p style="font-size:16px;font-weight:600;margin:0 0 12px">Код для входа</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:0.2em;margin:16px 0">${loginCode}</p>
    <p style="margin:0 0 16px">Код действует 15 минут. Введите его на странице входа в DINAMIC FONT.</p>
    <p style="font-size:12px;color:#6b7280">Если вы не запрашивали вход — смените пароль и удалите это письмо.</p>
  `);
  const text = `Код для входа: ${loginCode}\nКод действует 15 минут.\n\nВведите код на странице входа в DINAMIC FONT.\nЕсли вы не запрашивали вход — смените пароль.`;

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.info('[auth/login-email] RESEND_API_KEY не задан — код в консоль (dev):');
    console.info(`  To: ${email}`);
    console.info(`  Code: ${loginCode}`);
    return { dev: true };
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
    console.error('[auth/login-email] Resend error:', error);
    throw Object.assign(new Error('Email send failed'), { code: 'EMAIL_FAILED' });
  }
  return { dev: false };
}
