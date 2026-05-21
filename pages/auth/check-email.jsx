import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import {
  AUTH_CODE_INPUT_CLASS,
  AuthDividerOr,
  AuthLegalFooter,
  AuthLogoLink,
  AuthSubmitButton,
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
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

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
      setMessage('Новый код отправлен. Проверьте входящие и спам.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const verifyByCode = async (e) => {
    e.preventDefault();
    if (!email || verifyBusy) return;
    const digits = String(code || '').replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Введите 6 цифр из письма.');
      return;
    }
    setVerifyBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: digits }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data?.code === 'TOKEN_EXPIRED') {
        setError('Код устарел. Запросите новое письмо.');
        return;
      }
      if (!res.ok) {
        setError('Неверный код. Проверьте письмо или запросите новый.');
        return;
      }
      void router.replace('/auth/signin?verified=1');
    } finally {
      setVerifyBusy(false);
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
          Подтвердите почту
        </h1>
        <p className="mt-4 text-center text-sm leading-relaxed text-gray-600">
          {mailError ? (
            email ? (
              <>
                Аккаунт на <span className="font-semibold text-gray-900">{email}</span> уже создан, но письмо не
                удалось отправить. Нажмите «Отправить код снова» — пришлём новый код. Проверьте «Спам».
              </>
            ) : (
              <>
                Аккаунт создан, но письмо не отправилось. Запросите код снова. Если письма нет — проверьте «Спам».
              </>
            )
          ) : email ? (
            <>
              На <span className="font-semibold text-gray-900">{email}</span> отправлен 6-значный код и ссылка для
              подтверждения. Введите код ниже или перейдите по ссылке в письме.
            </>
          ) : (
            <>В письме — 6-значный код и ссылка. Введите код ниже или откройте ссылку из письма.</>
          )}
        </p>

        {message ? (
          <p className="mt-4 text-center text-xs font-medium text-green-800">{message}</p>
        ) : null}
        {error ? <p className="mt-4 text-center text-xs font-medium text-red-700">{error}</p> : null}

        {email ? (
          <>
            <form className="mt-8 flex flex-col gap-3" onSubmit={verifyByCode}>
              <label htmlFor="verify-code" className="text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                Код из письма
              </label>
              <input
                id="verify-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className={AUTH_CODE_INPUT_CLASS}
                disabled={verifyBusy}
              />
              <AuthSubmitButton loading={verifyBusy}>Подтвердить</AuthSubmitButton>
            </form>

            <div className="mt-6">
              <AuthDividerOr />
            </div>

            <button type="button" className="mt-6 w-full text-center text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900" disabled={busy} onClick={resend}>
              {busy ? 'Отправка…' : 'Отправить код снова'}
            </button>
          </>
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
