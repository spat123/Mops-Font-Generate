import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from './SignInProviderButtons';
import { AppButton } from '../ui/AppButton';
import { PopupDialogHeader } from '../ui/PopupDialogHeader';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { useLibraryAuth } from '../../contexts/LibraryAuthContext';
import { toast } from '../../utils/appNotify';
import { EditAssetIcon } from '../ui/EditAssetIcon';
import { loginIconUrl, userIconUrl } from '../ui/editIconUrls';

function ProfileRow({ label, children }) {
  return (
    <div className="flex min-h-[3.25rem] items-center justify-between gap-4 border-b border-gray-200 px-4 py-2.5 last:border-b-0">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-900">{label}</span>
      <div className="min-w-0 flex-1 text-right">{children}</div>
    </div>
  );
}

/** Горизонтальная линия с подписью по центру (как в макете «ЕЩЁ»). */
function LabeledDivider({ children }) {
  return (
    <div className="relative flex items-center py-1">
      <div className="h-px flex-1 bg-gray-200" aria-hidden />
      <span className="shrink-0 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
        {children}
      </span>
      <div className="h-px flex-1 bg-gray-200" aria-hidden />
    </div>
  );
}

export function AuthAccountPopover({ isSidebarCollapsed = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { planName, isPro, librariesCount, librariesLimit, openPlans } = useLibraryAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

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
  const provider = authenticated ? String(session.user?.provider || '') : '';
  const providerLabel =
    provider === 'google' ? 'Google' : provider === 'yandex' ? 'Яндекс' : provider === 'credentials' ? 'Email' : provider || '—';
  const planLabel = isPro ? 'Pro' : planName || 'Free';
  const limitText =
    typeof librariesCount === 'number' && typeof librariesLimit === 'number'
      ? `${librariesCount}/${librariesLimit}`
      : null;
  const limitReached =
    typeof librariesCount === 'number' && typeof librariesLimit === 'number' ? librariesCount >= librariesLimit : false;

  const planBlurb = isPro
    ? 'Расширенные лимиты и приоритетные возможности.'
    : typeof librariesLimit === 'number'
      ? `Доступно до ${librariesLimit} библиотек, генерация вариативных шрифтов`
      : 'Доступно несколько библиотек, генерация вариативных шрифтов';

  const sessionNameParts = authenticated && session?.user?.name ? String(session.user.name).trim().split(/\s+/) : [];
  const sessionFirst = sessionNameParts[0] || '';
  const sessionRest = sessionNameParts.slice(1).join(' ') || '';
  const profileDirty =
    firstName.trim() !== sessionFirst || lastName.trim() !== sessionRest;

  useEffect(() => {
    if (!authenticated || !session?.user?.name) {
      setFirstName('');
      setLastName('');
      return;
    }
    const parts = String(session.user.name).trim().split(/\s+/);
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
  }, [authenticated, session?.user?.name]);

  useEffect(() => {
    if (!open || !authenticated || typeof document === 'undefined') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, authenticated]);

  const accountModal =
    open && authenticated && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/30 p-4"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Профиль"
              className="flex max-h-[min(90vh,44rem)] w-full max-w-3xl flex-col overflow-hidden rounded-none bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <PopupDialogHeader title="Профиль" onClose={() => setOpen(false)} closeAriaLabel="Закрыть" />

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4">
                    <p className="text-base font-semibold uppercase leading-tight text-gray-900">{planLabel}</p>
                    <p className="text-xs font-medium leading-snug tracking-wide text-gray-700">
                      {planBlurb}
                    </p>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="sm"
                      fullWidth
                      className="mt-auto tracking-wide"
                      onClick={() => {
                        setOpen(false);
                        openPlans?.();
                      }}
                    >
                      Показать планы
                    </AppButton>
                  </div>

                  {limitReached && !isPro ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-amber-300/90 bg-[#FFFBEB] p-4">
                      <p className="text-base font-semibold uppercase leading-snug tracking-wide text-[#b45309]">
                        Лимит библиотек достигнут
                      </p>
                      <p className="text-xs font-medium leading-snug text-[#92400e]">
                        Улучшите план, чтобы получить больше возможностей.
                      </p>
                      <AppButton
                        type="button"
                        variant="accent"
                        size="sm"
                        fullWidth
                        className="mt-4 tracking-wide"
                        onClick={() => {
                          setOpen(false);
                          openPlans?.();
                        }}
                      >
                        Улучшить до Pro
                      </AppButton>
                    </div>
                  ) : (
                    <div className="hidden rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 sm:flex sm:flex-col sm:justify-center">
                      <p className="text-center text-[10px] font-semibold uppercase leading-relaxed tracking-wide text-gray-500">
                        {limitText ? (
                          <>
                            Библиотеки: <span className="tabular-nums text-gray-800">{limitText}</span>
                          </>
                        ) : (
                          'Аккаунт в порядке'
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 overflow-hidden bg-white">
                  <ProfileRow label="Email">
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-gray-900">
                      {session.user.email || '—'}
                    </span>
                  </ProfileRow>
                  <ProfileRow label="Имя">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="ml-auto block w-full max-w-[22rem] border-0 bg-transparent px-0 py-0.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                      placeholder="—"
                      autoComplete="given-name"
                    />
                  </ProfileRow>
                  <ProfileRow label="Фамилия">
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="ml-auto block w-full max-w-[22rem] border-0 bg-transparent px-0 py-0.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                      placeholder="—"
                      autoComplete="family-name"
                    />
                  </ProfileRow>
                </div>

                <AppButton
                  type="button"
                  variant="outline"
                  fullWidth
                  size="md"
                  disabled={!profileDirty}
                  className={`mt-3 rounded-lg tracking-wide ${
                    profileDirty
                      ? '!border-gray-300 !bg-gray-200 hover:!border-gray-400 hover:!bg-gray-300 hover:!text-gray-900'
                      : '!cursor-default !border-transparent !bg-[#F2F2F2] !text-gray-400 !opacity-100 hover:!border-transparent hover:!bg-[#F2F2F2] hover:!text-gray-400 disabled:hover:!border-transparent disabled:hover:!bg-[#F2F2F2] disabled:hover:!text-gray-400'
                  }`}
                  onClick={() => {
                    const next = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
                    if (!next) {
                      toast.info('Укажите имя или фамилию.');
                      return;
                    }
                    toast.info('Сохранение профиля на сервере появится в следующей версии.');
                  }}
                >
                  Сохранить
                </AppButton>

                <div className="mt-8">
                  <LabeledDivider>Ещё</LabeledDivider>
                  <div className="mt-4 space-y-0 overflow-hidden bg-white">
                    <div className="flex min-h-[3.25rem] items-center justify-between gap-4 border-b border-gray-200 pl-4 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-900">
                        Выйти из аккаунта
                      </span>
                      <AppButton
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 tracking-wide"
                        onClick={() => {
                          setOpen(false);
                          void signOut({ callbackUrl: router.asPath || '/' });
                        }}
                      >
                        Выйти
                      </AppButton>
                    </div>
                    <div className="flex min-h-[3.25rem] items-center justify-between gap-4 pl-4 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-900">Удалить аккаунт</span>
                      <AppButton
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 !border-accent !text-accent tracking-wide hover:!border-accent hover:!bg-accent hover:!text-white focus-visible:!ring-accent/40"
                        onClick={() => {
                          toast.info('Удаление аккаунта появится в следующей версии.');
                        }}
                      >
                        Удалить
                      </AppButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={`relative flex items-center justify-center ${isSidebarCollapsed ? '' : 'h-full min-h-0 w-full'}`}
    >
      <AppButton
        type="button"
        variant="toolbarIcon"
        pressed={open}
        size={isSidebarCollapsed ? 'icon' : 'rail'}
        className={
          isSidebarCollapsed
            ? 'group'
            : 'group overflow-hidden [&_img]:max-h-9'
        }
        onClick={() => {
          if (loading) return;
          if (!authenticated) {
            setOpen(false);
            void router.push({
              pathname: '/auth/signin',
              query: { callbackUrl: router.asPath || '/' },
            });
            return;
          }
          setOpen((v) => !v);
        }}
        aria-label={authenticated ? 'Аккаунт' : 'Войти'}
        aria-expanded={authenticated ? open : undefined}
        aria-haspopup={authenticated ? 'dialog' : undefined}
      >
        {authenticated && session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className={`rounded-md object-cover ${isSidebarCollapsed ? 'h-6 w-6' : 'h-full w-full min-h-0 min-w-0 max-h-9'}`}
          />
        ) : !authenticated ? (
          <EditAssetIcon
            src={loginIconUrl}
            className="h-4 w-4 transition-transform group-hover:scale-110"
          />
        ) : (
          <EditAssetIcon
            src={userIconUrl}
            className="h-4 w-4 transition-transform group-hover:scale-110"
          />
        )}
      </AppButton>

      {accountModal}

      {open && !authenticated ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Вход в аккаунт"
          className="absolute bottom-full right-0 z-[450] mb-2 w-[min(18rem,calc(100vw-1rem))] rounded-lg border border-gray-200 bg-white p-4"
        >
          {loading ? (
            <p className="text-center text-xs uppercase text-gray-500">Загрузка…</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-center text-xs font-semibold uppercase leading-snug text-gray-700">
                Войдите, чтобы создавать библиотеки.
              </p>
              <SignInProviderButtons callbackUrl={callbackUrl} />
              <AppButton
                type="button"
                variant="link"
                fullWidth
                className="text-center"
                onClick={() => {
                  setOpen(false);
                  void router.push('/auth/signin');
                }}
              >
                Полная страница входа
              </AppButton>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
