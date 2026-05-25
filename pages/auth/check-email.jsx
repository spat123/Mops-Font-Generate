import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { markHasSignedInBefore } from '../../utils/authReturningUser';
import { redirectAfterAuth, redirectAfterAuthQuery } from '../../utils/authRedirect';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import {
  AUTH_CODE_INPUT_CLASS,
  AUTH_FORM_ERROR_CLASS,
  AUTH_FORM_SUCCESS_CLASS,
  AuthDividerOr,
  AuthLegalFooter,
  AuthLogoLink,
  AuthOutlineButton,
  AuthSubmitButton,
  AuthSplitLayout,
} from '../../components/auth/AuthSplitLayout';

export async function getServerSideProps({ req }) {
  return { props: { isRuGeo: getIsRuGeoFromHeaders(req) } };
}

const RESEND_COOLDOWN_SEC = 60;

function formatResendCooldown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AuthCheckEmailPage({ isRuGeo = false }) {
  const router = useRouter();
  const emailRaw = typeof router.query?.email === 'string' ? router.query.email : '';
  const email = emailRaw.trim().toLowerCase();
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';
  const mailError = router.query?.mailError === '1';
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(Boolean(email));
  const [resendCooldown, setResendCooldown] = useState(0);
  const skipStatusRedirectRef = React.useRef(false);

  const signInHref = {
    pathname: '/auth/signin',
    query: { verified: '1', callbackUrl },
  };

  useEffect(() => {
    if (!router.isReady || !email) {
      setCheckingStatus(false);
      return;
    }
    let cancelled = false;
    setCheckingStatus(true);
    fetch('/api/auth/email-verification-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || skipStatusRedirectRef.current) return;
        if (data?.status === 'verified') {
          setAlreadyVerified(true);
          redirectAfterAuthQuery('/auth/signin', { verified: '1', callbackUrl });
          return;
        }
        if (data?.status === 'not_found') {
          setError(
            'Аккаунт не найден. Такое бывает, если сервер перезапустился и регистрация без DATABASE_URL не сохранилась. Попробуйте зарегистрироваться ещё раз.',
          );
          return;
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router.isReady, email, callbackUrl]);

  useEffect(() => {
    if (!router.isReady || !email || alreadyVerified) return;
    setResendCooldown(mailError ? 0 : RESEND_COOLDOWN_SEC);
  }, [router.isReady, email, mailError, alreadyVerified]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown > 0]);

  const resend = async () => {
    if (!email || busy || resendCooldown > 0) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404 && data?.code === 'NOT_FOUND') {
          setError(data?.error || 'Аккаунт не найден на сервере. Настройте DATABASE_URL и зарегистрируйтесь заново.');
          return;
        }
        setError('Не удалось отправить письмо. Попробуйте позже.');
        return;
      }
      if (data?.alreadyVerified) {
        setMessage('Почта уже подтверждена. Переходим ко входу…');
        redirectAfterAuthQuery('/auth/signin', { verified: '1', callbackUrl });
        return;
      }
      setMessage('Новый код отправлен. Проверьте входящие и спам.');
      setCode('');
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } finally {
      setBusy(false);
    }
  };

  const resendBlocked = busy || resendCooldown > 0;
  const resendLabel = busy
    ? 'Отправка…'
    : resendCooldown > 0
      ? `Отправить код снова (${formatResendCooldown(resendCooldown)})`
      : 'Отправить код снова';

  const verifyByCode = async (e) => {
    e.preventDefault();
    if (!email || verifyBusy) return;
    const digits = String(code || '').replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('Введите 6 цифр из письма.');
      return;
    }
    setVerifyBusy(true);
    skipStatusRedirectRef.current = true;
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, code: digits }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data?.code === 'TOKEN_EXPIRED') {
        setError('Код устарел. Запросите новое письмо.');
        return;
      }
      if (res.status === 404 && data?.code === 'NOT_FOUND') {
        setError(data?.error || 'Аккаунт не найден на сервере. Настройте DATABASE_URL и зарегистрируйтесь заново.');
        return;
      }
      if (!res.ok) {
        if (res.status >= 500) {
          setError('Ошибка сервера при проверке кода. Обновите страницу и попробуйте снова — почта могла уже подтвердиться.');
          return;
        }
        if (data?.code === 'INVALID_CODE') {
          setError('Неверный код. Проверьте письмо «Подтвердите email» или запросите новый.');
          return;
        }
        setError('Не удалось подтвердить код. Попробуйте ещё раз.');
        return;
      }
      if (data?.loginToken) {
        const signInRes = await signIn('credentials', {
          redirect: false,
          loginToken: data.loginToken,
          callbackUrl,
        });
        if (!signInRes?.error) {
          markHasSignedInBefore();
          redirectAfterAuth(callbackUrl);
          return;
        }
      }
      redirectAfterAuthQuery('/auth/signin', { verified: '1', callbackUrl });
    } finally {
      setVerifyBusy(false);
      skipStatusRedirectRef.current = false;
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
          {alreadyVerified || checkingStatus ? 'Почта подтверждена' : 'Подтвердите почту'}
        </h1>
        {checkingStatus ? (
          <p className="mt-4 text-center text-sm text-gray-500">Проверяем статус…</p>
        ) : null}
        {alreadyVerified ? (
          <p className={`mt-4 ${AUTH_FORM_SUCCESS_CLASS}`}>Перенаправляем на страницу входа…</p>
        ) : null}
        {!checkingStatus && !alreadyVerified ? (
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
              На <span className="font-semibold text-gray-900">{email}</span> отправлен код из письма{' '}
              <span className="font-semibold">«Подтвердите email»</span>. После ввода вы сразу войдёте в аккаунт.
            </>
          ) : (
            <>В письме — 6-значный код и ссылка. Введите код ниже или откройте ссылку из письма.</>
          )}
        </p>
        ) : null}

        {!checkingStatus && !alreadyVerified && message ? (
          <p className={`mt-4 ${AUTH_FORM_SUCCESS_CLASS}`}>{message}</p>
        ) : null}
        {!checkingStatus && !alreadyVerified && error ? (
          <p className={`mt-4 ${AUTH_FORM_ERROR_CLASS}`}>{error}</p>
        ) : null}

        {!checkingStatus && !alreadyVerified && email ? (
          <>
            <form className="mt-8 flex flex-col gap-3" onSubmit={verifyByCode}>
              <label htmlFor="verify-code" className="text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                Код подтверждения регистрации
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
              <AuthSubmitButton loading={verifyBusy}>Подтвердить и войти</AuthSubmitButton>
            </form>

            <div className="mt-6">
              <AuthDividerOr />
            </div>

            <AuthOutlineButton
              type="button"
              className="mt-6"
              loading={busy}
              disabled={resendBlocked}
              onClick={resend}
            >
              {resendLabel}
            </AuthOutlineButton>
          </>
        ) : null}

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          <Link
            href={signInHref}
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            {alreadyVerified ? 'Войти' : 'Перейти ко входу'}
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
