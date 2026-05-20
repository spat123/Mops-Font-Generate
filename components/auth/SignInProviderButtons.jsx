import React, { useEffect, useState } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { AppButton } from '../ui/AppButton';

const AUTH_OAUTH_BTN_CLASS =
  'inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold uppercase text-gray-900 transition-colors hover:bg-gray-900 hover:text-white hover:border-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/10 [font-feature-settings:normal]';

export function SignInProviderButtons({ callbackUrl = '/', layout = 'stack', appearance = 'default' }) {
  const [providerIds, setProviderIds] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getProviders()
      .then((p) => {
        if (cancelled || !p) return;
        setProviderIds(Object.keys(p));
      })
      .catch(() => {
        if (!cancelled) setProviderIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onGoogle = () => {
    void signIn('google', { callbackUrl });
  };
  const onYandex = () => {
    void signIn('yandex', { callbackUrl });
  };
  const wrap = layout === 'row' ? 'flex flex-row flex-wrap gap-2' : 'flex flex-col gap-2';

  if (providerIds && providerIds.length === 0) {
    return (
      <p className="text-center text-xs leading-relaxed text-gray-500">
        Провайдеры входа не настроены. Локально — <code className="font-mono">.env.local</code>, на сайте в
        интернете — переменные в панели Vercel (Settings → Environment Variables). См.{' '}
        <code className="font-mono">docs/AUTH_SETUP.md</code>.
      </p>
    );
  }

  const showGoogle = !providerIds || providerIds.includes('google');
  const showYandex = !providerIds || providerIds.includes('yandex');
  const hasOAuthButtons = showGoogle || showYandex;

  // Когда NextAuth отдаёт только credentials — providerIds = ["credentials"].
  // В этом случае нужно показать понятное состояние, а не пустой блок.
  if (providerIds && !hasOAuthButtons) {
    return (
      <p className="text-center text-xs leading-relaxed text-gray-500">
        Вход через Google/Яндекс на сервере не подключён (нет <code className="font-mono">GOOGLE_*</code> /{' '}
        <code className="font-mono">YANDEX_*</code> в окружении). Локально — <code className="font-mono">.env.local</code>,
        на продакшене — Vercel → Environment Variables → Redeploy. См.{' '}
        <code className="font-mono">docs/AUTH_SETUP.md</code>.
      </p>
    );
  }

  const useAuthChrome = appearance === 'auth';

  const googleInner = (
    <>
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Google
    </>
  );

  const yandexInner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/ya_favicon.svg"
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 shrink-0 select-none"
        draggable={false}
      />
      Яндекс
    </>
  );

  return (
    <div className={wrap}>
      {showGoogle ? (
        useAuthChrome ? (
          <button type="button" className={AUTH_OAUTH_BTN_CLASS} onClick={onGoogle}>
            {googleInner}
          </button>
        ) : (
          <AppButton type="button" fullWidth onClick={onGoogle}>
            {googleInner}
          </AppButton>
        )
      ) : null}
      {showYandex ? (
        useAuthChrome ? (
          <button type="button" className={AUTH_OAUTH_BTN_CLASS} onClick={onYandex}>
            {yandexInner}
          </button>
        ) : (
          <AppButton type="button" fullWidth onClick={onYandex}>
            {yandexInner}
          </AppButton>
        )
      ) : null}
    </div>
  );
}
