import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from '../../components/auth/SignInProviderButtons';

export default function AuthSignUpPage() {
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
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="px-4 pt-10">
          <Link href="/" className="mx-auto flex w-fit items-center justify-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/Logo%20Mark.svg"
              alt="DINAMIC FONT"
              className="h-8 w-8 select-none"
              draggable={false}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/Logo%20Text.svg"
              alt="DINAMIC FONT"
              className="h-[1.6rem] w-auto select-none"
              draggable={false}
            />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8">
            <h1 className="text-center text-base font-semibold uppercase tracking-tight text-gray-900">
              Регистрация в DINAMIC FONT
            </h1>

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
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500" htmlFor="name">
                  Имя
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black/[0.14] focus:outline-none"
                  placeholder="Игорь"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500" htmlFor="email">
                  Электронная почта
                </label>
                <input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black/[0.14] focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500" htmlFor="password">
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black/[0.14] focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500" htmlFor="passwordRepeat">
                  Повторить пароль
                </label>
                <input
                  id="passwordRepeat"
                  type="password"
                  value={passwordRepeat}
                  onChange={(e) => setPasswordRepeat(e.target.value)}
                  autoComplete="new-password"
                  className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black/[0.14] focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
              {formError ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{formError}</p>
              ) : null}
              <button
                type="submit"
                className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent bg-accent px-4 text-xs font-semibold uppercase tracking-tight text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Зарегистрироваться
              </button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">или</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="mt-4">
              <SignInProviderButtons callbackUrl={callbackUrl} />
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              Уже есть аккаунт?{' '}
              <Link href="/auth/signin" className="font-semibold text-accent hover:underline">
                Войти
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

