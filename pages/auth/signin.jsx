import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from '../../components/auth/SignInProviderButtons';

export default function AuthSignInPage() {
  const { status } = useSession();
  const router = useRouter();
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';

  useEffect(() => {
    if (status === 'authenticated') {
      void router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  return (
    <>
      <Head>
        <title>Вход — DINAMIC FONT</title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-center text-lg font-semibold uppercase tracking-tight text-gray-900">Вход</h1>
          <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
            После входа можно создавать до трёх библиотек шрифтов. Мы не продаём шрифты — только сохраняем ваши списки
            локально в браузере.
          </p>
          <div className="mt-6">
            <SignInProviderButtons callbackUrl={callbackUrl} />
          </div>
          <Link
            href="/"
            className="mt-6 block text-center text-xs font-semibold uppercase text-gray-400 transition-colors hover:text-accent"
          >
            На главную
          </Link>
        </div>
      </div>
    </>
  );
}
