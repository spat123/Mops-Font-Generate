import { Resend } from 'resend';

function getFromAddress() {
  const from = String(process.env.EMAIL_FROM || '').trim();
  if (from) return from;
  return 'DINAMIC FONT <onboarding@resend.dev>';
}

function buildVerifyUrl(token) {
  const base = String(process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail({ to, name, token }) {
  const email = String(to || '').trim().toLowerCase();
  if (!email || !token) throw Object.assign(new Error('Invalid email payload'), { code: 'VALIDATION' });

  const verifyUrl = buildVerifyUrl(token);
  const displayName = String(name || '').trim() || 'пользователь';
  const subject = 'Подтвердите email — DINAMIC FONT';
  const html = `
    <p>Здравствуйте, ${displayName}!</p>
    <p>Чтобы завершить регистрацию в DINAMIC FONT, подтвердите адрес почты:</p>
    <p><a href="${verifyUrl}">Подтвердить email</a></p>
    <p>Ссылка действует 24 часа. Если вы не регистрировались — просто проигнорируйте письмо.</p>
  `;
  const text = `Подтвердите email: ${verifyUrl}\nСсылка действует 24 часа.`;

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.info('[auth/email] RESEND_API_KEY не задан — письмо в консоль (dev):');
    console.info(`  To: ${email}`);
    console.info(`  ${verifyUrl}`);
    return { dev: true, verifyUrl };
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
    console.error('[auth/email] Resend error:', error);
    throw Object.assign(new Error('Email send failed'), { code: 'EMAIL_FAILED' });
  }
  return { dev: false };
}
