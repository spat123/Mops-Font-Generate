import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import {
  AUTH_INPUT_CLASS,
  AUTH_FORM_ERROR_CLASS,
  AUTH_PRIMARY_BTN_CLASS,
  AuthLegalFooter,
  AuthLogoLink,
  AuthSplitLayout,
} from '../../components/auth/AuthSplitLayout';

export async function getServerSideProps({ req }) {
  return { props: { isRuGeo: getIsRuGeoFromHeaders(req) } };
}

export default function AuthLinkPage({ isRuGeo = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';

  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const submittingRef = React.useRef(false);

  const pending = session?.user?.pendingLink || null;
  const email = pending?.email || session?.user?.email || '';
  const providerLabel = pending?.provider === 'google' ? 'Google' : pending?.provider === 'yandex' ? 'Яндекс' : 'Провайдер';

  React.useEffect(() => {
    if (status === 'authenticated' && session?.user?.needsLink !== true) {
      void router.replace(callbackUrl);
    }
  }, [status, session?.user?.needsLink, router, callbackUrl]);

  return (
    <>
      <Head>
        <title>Привязка аккаунта — DINAMIC FONT</title>
      </Head>
      <AuthSplitLayout isRuGeo={isRuGeo} footer={<AuthLegalFooter />}>
        <AuthLogoLink className="mb-10" />

        <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">
          Подтвердите привязку
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-gray-500">
          Мы нашли аккаунт с этой почтой. Чтобы привязать вход через {providerLabel}, введите пароль от аккаунта.
        </p>

        <div className="mt-6 rounded-lg bg-[#f0f0f0] px-4 py-3 text-center text-sm text-gray-800 [font-feature-settings:normal]">
          {email ? <span className="font-semibold">{email}</span> : 'Email не найден'}
        </div>

        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (submittingRef.current) return;
            submittingRef.current = true;
            setError('');
            try {
              if (!pending?.provider || !pending?.providerAccountId || !pending?.email) {
                setError('Нет данных для привязки. Попробуйте войти заново.');
                return;
              }
              if (!password) {
                setError('Введите пароль.');
                return;
              }

              const res = await fetch('/api/auth/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
              });
              if (res.status === 401) {
                setError('Неверный пароль.');
                return;
              }
              if (!res.ok) {
                setError('Не удалось привязать аккаунт. Попробуйте ещё раз.');
                return;
              }

              const signInRes = await signIn('credentials', {
                redirect: false,
                email: pending.email,
                password,
                callbackUrl,
              });
              if (signInRes?.error) {
                setError('Привязали аккаунт, но войти не получилось. Откройте страницу входа.');
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
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={AUTH_INPUT_CLASS}
            placeholder="ПАРОЛЬ"
          />
          {error ? <p className={AUTH_FORM_ERROR_CLASS}>{error}</p> : null}
          <button type="submit" className={AUTH_PRIMARY_BTN_CLASS}>
            Привязать и войти
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          Передумали?{' '}
          <Link
            href="/auth/signin"
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            Вернуться ко входу
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
