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

export async function sendVerificationEmail({ to, name, token, code }) {
  const email = String(to || '').trim().toLowerCase();
  if (!email || !token) throw Object.assign(new Error('Invalid email payload'), { code: 'VALIDATION' });

  const verifyUrl = buildVerifyUrl(token);
  const verifyCode = String(code || '').replace(/\D/g, '').slice(0, 6);
  const displayName = String(name || '').trim() || 'пользователь';
  const subject = 'Подтвердите email — DINAMIC FONT';
  const codeBlock = verifyCode
    ? `<p style="font-size:28px;font-weight:bold;letter-spacing:0.2em;margin:16px 0">${verifyCode}</p>
       <p>Или введите этот код на странице подтверждения на сайте.</p>`
    : '';
  const codeText = verifyCode ? `Код подтверждения: ${verifyCode}\n\n` : '';
  const html = `
    <p>Здравствуйте, ${displayName}!</p>
    <p>Чтобы завершить регистрацию в DINAMIC FONT, подтвердите адрес почты:</p>
    ${codeBlock}
    <p><a href="${verifyUrl}">Подтвердить email по ссылке</a></p>
    <p>Код и ссылка действуют 24 часа. Если вы не регистрировались — просто проигнорируйте письмо.</p>
  `;
  const text = `${codeText}Подтвердите email: ${verifyUrl}\nКод и ссылка действуют 24 часа.`;

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.info('[auth/email] RESEND_API_KEY не задан — письмо в консоль (dev):');
    console.info(`  To: ${email}`);
    if (verifyCode) console.info(`  Code: ${verifyCode}`);
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
