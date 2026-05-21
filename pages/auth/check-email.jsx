import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import {
  AUTH_PRIMARY_BTN_CLASS,
  AuthLegalFooter,
  AuthLogoLink,
  AuthSplitLayout,
} from '../../components/auth/AuthSplitLayout';

export async function getServerSideProps({ req }) {
  return { props: { isRuGeo: getIsRuGeoFromHeaders(req) } };
}

export default function AuthCheckEmailPage({ isRuGeo = false }) {
  const router = useRouter();
  const emailRaw = typeof router.query?.email === 'string' ? router.query.email : '';
  const email = emailRaw.trim().toLowerCase();
  const mailError = router.query?.mailError === '1';
  const [message, setMessage] = useState('');
  const [error, setError] = useState(
    mailError
      ? 'Аккаунт создан, но письмо не ушло. Нажмите «Отправить письмо снова» (нужен рабочий Resend на сервере).'
      : '',
  );
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    if (!email || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError('Не удалось отправить письмо. Попробуйте позже.');
        return;
      }
      setMessage('Письмо отправлено повторно. Проверьте входящие и спам.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Подтвердите email — DINAMIC FONT</title>
      </Head>
      <AuthSplitLayout isRuGeo={isRuGeo} footer={<AuthLegalFooter />}>
        <AuthLogoLink className="mb-10" />

        <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">
          Проверьте почту
        </h1>
        <p className="mt-4 text-center text-sm leading-relaxed text-gray-600">
          {email ? (
            <>
              Мы отправили ссылку для подтверждения на{' '}
              <span className="font-semibold text-gray-900">{email}</span>. Перейдите по ссылке в письме, затем войдите в
              аккаунт.
            </>
          ) : (
            <>Мы отправили ссылку для подтверждения. Перейдите по ссылке в письме, затем войдите в аккаунт.</>
          )}
        </p>

        {message ? <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-800">{message}</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p> : null}

        {email ? (
          <button type="button" className={`${AUTH_PRIMARY_BTN_CLASS} mt-8`} disabled={busy} onClick={resend}>
            {busy ? 'Отправка…' : 'Отправить письмо снова'}
          </button>
        ) : null}

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          <Link
            href="/auth/signin"
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            Перейти ко входу
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
