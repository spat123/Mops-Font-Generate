import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import {
  AUTH_FORM_ERROR_CLASS,
  AUTH_INPUT_CLASS,
  AuthSubmitButton,
  AuthLegalFooter,
  AuthLogoLink,
  AuthSplitLayout,
} from '../../components/auth/AuthSplitLayout';

export async function getServerSideProps({ req }) {
  return { props: { isRuGeo: getIsRuGeoFromHeaders(req) } };
}

export default function AuthResetPasswordPage({ isRuGeo = false }) {
  const router = useRouter();
  const token = typeof router.query?.token === 'string' ? router.query.token : '';
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';
  const [password, setPassword] = React.useState('');
  const [passwordRepeat, setPasswordRepeat] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);

  const signInHref = { pathname: '/auth/signin', query: { reset: '1', callbackUrl } };
  const forgotHref = { pathname: '/auth/forgot-password', query: { callbackUrl } };
  const tokenReady = router.isReady && Boolean(token);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current || !token) return;
    const p1 = String(password || '');
    const p2 = String(passwordRepeat || '');
    if (p1.length < 6) {
      setFormError('Пароль должен быть не короче 6 символов.');
      return;
    }
    if (p1 !== p2) {
      setFormError('Пароли не совпадают.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: p1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && data?.code === 'TOKEN_EXPIRED') {
        setFormError('Ссылка устарела. Запросите новую на странице восстановления.');
        return;
      }
      if (!res.ok) {
        setFormError('Ссылка недействительна. Запросите новую.');
        return;
      }
      void router.replace(signInHref);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Новый пароль — DINAMIC FONT</title>
      </Head>
      <AuthSplitLayout isRuGeo={isRuGeo} footer={<AuthLegalFooter />}>
        <AuthLogoLink className="mb-10" />

        <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">
          Новый пароль
        </h1>

        {!router.isReady ? (
          <p className="mt-6 text-center text-sm text-gray-500">Загрузка…</p>
        ) : !tokenReady ? (
          <>
            <p className={`mt-6 ${AUTH_FORM_ERROR_CLASS}`}>Ссылка для сброса отсутствует или недействительна.</p>
            <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
              <Link
                href={forgotHref}
                className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
              >
                Запросить новую ссылку
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-center text-sm text-gray-600">Задайте новый пароль для входа в аккаунт.</p>
            <form className="mt-8 flex flex-col gap-3" onSubmit={onSubmit}>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={AUTH_INPUT_CLASS}
                placeholder="НОВЫЙ ПАРОЛЬ"
                disabled={submitting}
              />
              <input
                id="new-password-repeat"
                type="password"
                value={passwordRepeat}
                onChange={(e) => setPasswordRepeat(e.target.value)}
                autoComplete="new-password"
                className={AUTH_INPUT_CLASS}
                placeholder="ПОВТОРИТЕ ПАРОЛЬ"
                disabled={submitting}
              />
              {formError ? <p className={AUTH_FORM_ERROR_CLASS}>{formError}</p> : null}
              <AuthSubmitButton loading={submitting}>Сохранить пароль</AuthSubmitButton>
            </form>
            <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
              <Link
                href={forgotHref}
                className="text-gray-600 underline underline-offset-2 hover:text-gray-900"
              >
                Запросить другую ссылку
              </Link>
            </p>
          </>
        )}

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          <Link
            href={{ pathname: '/auth/signin', query: { callbackUrl } }}
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            Вернуться ко входу
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
