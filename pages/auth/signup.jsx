import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from '../../components/auth/SignInProviderButtons';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import {
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
  AuthDividerOr,
  AuthLegalFooter,
  AuthLogoLink,
  AuthSplitLayout,
} from '../../components/auth/AuthSplitLayout';

export async function getServerSideProps({ req }) {
  return { props: { isRuGeo: getIsRuGeoFromHeaders(req) } };
}

export default function AuthSignUpPage({ isRuGeo = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordRepeat, setPasswordRepeat] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const submittingRef = React.useRef(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.user?.needsLink) {
      void router.replace({ pathname: '/auth/link', query: { callbackUrl } });
      return;
    }
    void router.replace(callbackUrl);
  }, [status, session?.user?.needsLink, router, callbackUrl]);

  return (
    <>
      <Head>
        <title>Регистрация — DINAMIC FONT</title>
      </Head>
      <AuthSplitLayout isRuGeo={isRuGeo} footer={<AuthLegalFooter />}>
        <AuthLogoLink className="mb-10" />

        <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">Регистрация</h1>
        <p className="mt-2 text-center text-sm font-normal text-gray-500">Добро пожаловать!</p>

        <div className="mt-8 flex flex-col gap-2">
          <SignInProviderButtons callbackUrl={callbackUrl} appearance="auth" />
        </div>

        <div className="mt-6">
          <AuthDividerOr />
        </div>

        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (submittingRef.current) return;
            submittingRef.current = true;
            setFormError('');
            try {
              const trimmedName = String(name || '').trim();
              const trimmedEmail = String(email || '').trim().toLowerCase();
              const p1 = String(password || '');
              const p2 = String(passwordRepeat || '');
              if (!trimmedName) {
                setFormError('Введите имя.');
                return;
              }
              if (!trimmedEmail || !trimmedEmail.includes('@')) {
                setFormError('Введите корректную электронную почту.');
                return;
              }
              if (!p1 || p1.length < 6) {
                setFormError('Пароль должен быть не короче 6 символов.');
                return;
              }
              if (p1 !== p2) {
                setFormError('Пароли не совпадают.');
                return;
              }

              const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password: p1 }),
              });
              if (res.status === 409) {
                setFormError('Аккаунт с такой почтой уже существует. Попробуйте войти.');
                return;
              }
              if (!res.ok) {
                setFormError('Не удалось зарегистрироваться. Попробуйте ещё раз.');
                return;
              }

              const signInRes = await signIn('credentials', {
                redirect: false,
                email: trimmedEmail,
                password: p1,
                callbackUrl,
              });
              if (signInRes?.error) {
                setFormError('Аккаунт создан, но войти не получилось. Откройте страницу входа.');
                return;
              }
              const nextUrl = typeof signInRes?.url === 'string' ? signInRes.url : callbackUrl;
              void router.replace(nextUrl);
            } finally {
              submittingRef.current = false;
            }
          }}
        >
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className={AUTH_INPUT_CLASS}
            placeholder="ИМЯ"
          />
          <input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className={AUTH_INPUT_CLASS}
            placeholder="EMAIL"
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={AUTH_INPUT_CLASS}
            placeholder="ПАРОЛЬ"
          />
          <input
            id="passwordRepeat"
            type="password"
            value={passwordRepeat}
            onChange={(e) => setPasswordRepeat(e.target.value)}
            autoComplete="new-password"
            className={AUTH_INPUT_CLASS}
            placeholder="ПОВТОРИТЬ ПАРОЛЬ"
          />
          {formError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{formError}</p> : null}
          <button type="submit" className={AUTH_PRIMARY_BTN_CLASS}>
            Зарегистрироваться
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          Уже есть аккаунт?{' '}
          <Link
            href="/auth/signin"
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            Войти
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
