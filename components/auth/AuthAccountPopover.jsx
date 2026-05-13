import React, { useEffect, useRef, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from './SignInProviderButtons';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';

function IconUser({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function AuthAccountPopover({ isSidebarCollapsed = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);

  const callbackUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';

  useDismissibleLayer({
    open,
    refs: [rootRef, panelRef],
    onDismiss: () => setOpen(false),
  });

  useEffect(() => {
    if (isSidebarCollapsed) setOpen(false);
  }, [isSidebarCollapsed]);

  const authenticated = status === 'authenticated' && session?.user;
  const loading = status === 'loading';

  return (
    <div ref={rootRef} className="relative flex items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group inline-flex items-center justify-center rounded-md transition-all ${
          open
            ? 'bg-accent text-white shadow-sm'
            : 'bg-gray-50 text-gray-600 hover:bg-accent/10 hover:text-accent'
        } ${isSidebarCollapsed ? 'h-9 w-9' : ''}`}
        aria-label={authenticated ? 'Аккаунт' : 'Войти'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {authenticated && session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className={`rounded-md object-cover ${isSidebarCollapsed ? 'h-6 w-6' : 'h-4 w-4'}`}
          />
        ) : (
          <IconUser className={isSidebarCollapsed ? 'h-4 w-4' : 'h-4 w-4'} />
        )}
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Вход в аккаунт"
          className="absolute bottom-full right-0 z-[450] mb-2 w-[min(18rem,calc(100vw-1rem))] rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
        >
          {loading ? (
            <p className="text-center text-xs uppercase text-gray-500">Загрузка…</p>
          ) : authenticated ? (
            <div className="flex flex-col gap-3">
              <div className="min-w-0 border-b border-gray-100 pb-3">
                <p className="truncate text-sm font-semibold text-gray-900">{session.user.name || 'Профиль'}</p>
                {session.user.email ? (
                  <p className="truncate text-xs text-gray-500">{session.user.email}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold uppercase text-gray-800 transition-colors hover:bg-gray-50"
                onClick={() => {
                  setOpen(false);
                  void signOut({ callbackUrl: router.asPath || '/' });
                }}
              >
                Выйти
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-center text-xs font-semibold uppercase leading-snug text-gray-700">
                Войдите, чтобы создавать библиотеки (до 3)
              </p>
              <SignInProviderButtons callbackUrl={callbackUrl} />
              <button
                type="button"
                className="text-center text-[11px] font-medium uppercase text-gray-400 underline-offset-2 hover:text-accent hover:underline"
                onClick={() => {
                  setOpen(false);
                  void router.push('/auth/signin');
                }}
              >
                Полная страница входа
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
