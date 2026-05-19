import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getProviders, signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from '../../components/auth/SignInProviderButtons';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import { hasSignedInBefore, markHasSignedInBefore } from '../../utils/authReturningUser';
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

export default function AuthSignInPage({ isRuGeo = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';
  const [login, setLogin] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [credentialsEnabled, setCredentialsEnabled] = React.useState(null);
  const [isReturningUser, setIsReturningUser] = React.useState(false);
  const submittingRef = React.useRef(false);

  useEffect(() => {
    setIsReturningUser(hasSignedInBefore());
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.user?.needsLink) {
      void router.replace({ pathname: '/auth/link', query: { callbackUrl } });
      return;
    }
    void router.replace(callbackUrl);
  }, [status, session?.user?.needsLink, router, callbackUrl]);

  useEffect(() => {
    let cancelled = false;
    getProviders()
      .then((p) => {
        if (cancelled || !p) return;
        setCredentialsEnabled(Boolean(p.credentials));
      })
      .catch(() => {
        if (!cancelled) setCredentialsEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Head>
        <title>{isReturningUser ? 'С возвращением — DINAMIC FONT' : 'Вход — DINAMIC FONT'}</title>
      </Head>
      <AuthSplitLayout isRuGeo={isRuGeo} footer={<AuthLegalFooter />}>
        <AuthLogoLink className="mb-10" />

        {isReturningUser ? (
          <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">С возвращением!</h1>
        ) : (
          <>
            <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">Вход</h1>
            <p className="mt-2 text-center text-sm font-normal text-gray-500">Добро пожаловать!</p>
          </>
        )}

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
              if (credentialsEnabled === false) {
                setFormError('Вход по логину/паролю пока не настроен.');
                return;
              }
              const trimmedLogin = String(login || '').trim();
              const trimmedPassword = String(password || '');
              if (!trimmedLogin || !trimmedPassword) {
                setFormError('Введите логин и пароль.');
                return;
              }
              const res = await signIn('credentials', {
                redirect: false,
                email: trimmedLogin,
                password: trimmedPassword,
                callbackUrl,
              });
              if (res?.error) {
                setFormError('Неверный логин или пароль.');
                return;
              }
              markHasSignedInBefore();
              const nextUrl = typeof res?.url === 'string' ? res.url : callbackUrl;
              void router.replace(nextUrl);
            } finally {
              submittingRef.current = false;
            }
          }}
        >
          <input
            id="login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            className={AUTH_INPUT_CLASS}
            placeholder="ЛОГИН ИЛИ EMAIL"
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={AUTH_INPUT_CLASS}
            placeholder="ПАРОЛЬ"
          />
          {formError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{formError}</p> : null}
          <button type="submit" className={AUTH_PRIMARY_BTN_CLASS}>
            Вход
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          Нет аккаунта?{' '}
          <Link
            href="/auth/signup"
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            Зарегистрироваться
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
