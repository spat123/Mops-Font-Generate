import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function AuthLinkPage() {
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
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="px-4 pt-10">
          <Link href="/" className="mx-auto flex w-fit items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/Logo%20Mark.svg" alt="DINAMIC FONT" className="h-8 w-8 select-none" draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/Logo%20Text.svg" alt="DINAMIC FONT" className="h-[1.6rem] w-auto select-none" draggable={false} />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8">
            <h1 className="text-center text-base font-semibold uppercase tracking-tight text-gray-900">
              Подтвердите привязку
            </h1>
            <p className="mt-2 text-center text-xs leading-relaxed text-gray-600">
              Мы нашли аккаунт с этой почтой. Чтобы привязать вход через {providerLabel}, введите пароль от аккаунта.
            </p>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
              {email ? <span className="font-semibold">{email}</span> : 'Email не найден'}
            </div>

            <form
              className="mt-4 flex flex-col gap-3"
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
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500" htmlFor="password">
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black/[0.14] focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p> : null}
              <button
                type="submit"
                className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent bg-accent px-4 text-xs font-semibold uppercase tracking-tight text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Привязать и войти
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-500">
              Передумали?{' '}
              <Link href="/auth/signin" className="font-semibold text-accent hover:underline">
                Вернуться ко входу
              </Link>
            </p>
          </div>
        </main>

        <footer className="px-4 pb-8">
          <p className="mx-auto max-w-sm text-center text-[11px] leading-relaxed text-gray-500">
            Создавая аккаунт, вы соглашаетесь с{' '}
            <Link href="/legal/terms" className="font-semibold text-gray-700 hover:text-accent hover:underline">
              Условия использования
            </Link>{' '}
            и{' '}
            <Link href="/legal/privacy" className="font-semibold text-gray-700 hover:text-accent hover:underline">
              Политика конфиденциальности
            </Link>
            .
          </p>
        </footer>
      </div>
    </>
  );
}

