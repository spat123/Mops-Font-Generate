import { useEffect, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { createPortal } from 'react-dom';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from './SignInProviderButtons';
import { AccountDeleteConfirmModal, AccountDeletedSuccessModal } from './AccountDeletionModals';
import { AppButton } from '../ui/AppButton';
import { Tooltip } from '../ui/Tooltip';
import { PopupDialogHeader } from '../ui/PopupDialogHeader';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { useLibraryAuth } from '../../contexts/LibraryAuthContext';
import { toast } from '../../utils/appNotify';
import { EditAssetIcon } from '../ui/EditAssetIcon';
import { loginIconUrl, updateIconUrl, userIconUrl } from '../ui/editIconUrls';
import {
  FREE_STATIC_GENERATIONS_LIMIT,
  readFreeStaticGenerationsUsed,
} from '../../utils/freeStaticGenerationQuota';
import { getBillingCopy } from '../../utils/billingCopy';
import { MAX_SHARE_FONTS_FREE } from '../../utils/libraryShareLimits';
import { SelectChevronIcon } from '../ui/SelectChevronIcon';

const AVATAR_CLASS = 'h-4 w-4 shrink-0 rounded-full object-cover';

function ProfileRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[3.25rem] items-center justify-between gap-4 border-b border-gray-200 px-4 py-2.5 last:border-b-0">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-900">{label}</span>
      <div className="min-w-0 flex-1 text-right">{children}</div>
    </div>
  );
}

/** Горизонтальная линия с подписью по центру (как в макете «ЕЩЁ»). */
function LabeledDivider({ children }: { children: React.ReactNode }) {
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

function AccountTriggerAvatar({
  authenticated,
  loading,
  session,
}: {
  authenticated: boolean;
  loading: boolean;
  session: ReturnType<typeof useSession>['data'];
}) {
  if (loading) {
    return <span className={`${AVATAR_CLASS} animate-pulse bg-gray-200`} aria-hidden />;
  }
  if (authenticated && session?.user?.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={session.user.image} alt="" className={AVATAR_CLASS} referrerPolicy="no-referrer" />
    );
  }
  if (!authenticated) {
    return <EditAssetIcon src={loginIconUrl} className={`${AVATAR_CLASS} !rounded-none transition-transform group-hover:scale-110`} />;
  }
  return <EditAssetIcon src={userIconUrl} className={`${AVATAR_CLASS} !rounded-none transition-transform group-hover:scale-110`} />;
}

function ProfileDangerExpander({ onDelete }: { onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="flex h-4 w-full items-center justify-center rounded-sm bg-gray-100 text-gray-500 transition-colors hover:bg-gray-900"
        aria-expanded={expanded}
        aria-label={expanded ? 'Скрыть удаление аккаунта' : 'Показать удаление аккаунта'}
        onClick={() => setExpanded((v) => !v)}
      >
        <SelectChevronIcon className="h-4 w-4" open={expanded} />
      </button>
      {expanded ? (
        <div className="mt-0 overflow-hidden bg-white">
          <div className="flex min-h-[3.25rem] items-center justify-between gap-4 pl-4 py-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-900">Удалить аккаунт</span>
            <AppButton
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 !border-accent !text-accent tracking-wide hover:!border-accent hover:!bg-accent hover:!text-white focus-visible:!ring-accent/40"
              onClick={onDelete}
            >
              Удалить
            </AppButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenuItem({ icon, children, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 ${className}`.trim()}
      onClick={onClick}
    >
      {icon ? <span className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-600">{icon}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/** Меню над футером сайдбара: влево на всю доступную ширину (не обрезается overflow сайдбара). */
function useSidebarFooterMenuLayout(open, anchorRef) {
  const [layout, setLayout] = useState(null);

  useIsomorphicLayoutEffect(() => {
    if (!open || typeof window === 'undefined' || !anchorRef.current) {
      setLayout(null);
      return undefined;
    }

    const sync = () => {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const footerEl = anchorRef.current.closest('[data-sidebar-footer]');
      const footerRect = footerEl?.getBoundingClientRect();
      const inset = 8;
      const left = footerRect ? footerRect.left + inset : anchorRect.left;
      const width = Math.max(200, anchorRect.right - left - inset);

      setLayout({
        left,
        width,
        bottom: window.innerHeight - anchorRect.top + inset,
      });
    };

    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [open, anchorRef]);

  return layout;
}

export function AuthAccountPopover({ isSidebarCollapsed = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { planName, isPro, librariesCount, librariesLimit, openPlans } = useLibraryAuth();
  const billing = getBillingCopy();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const panelRef = useRef(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [freeGenUsed, setFreeGenUsed] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [recoverableUntil, setRecoverableUntil] = useState(null);

  const callbackUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';

  const handleConfirmDeleteAccount = async () => {
    setDeleteBusy(true);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Не удалось удалить аккаунт. Попробуйте позже.');
        return;
      }
      setRecoverableUntil(data.recoverableUntil || null);
      setDeleteConfirmOpen(false);
      setProfileOpen(false);
      setMenuOpen(false);
      setDeleteSuccessOpen(true);
      await signOut({ redirect: false });
    } finally {
      setDeleteBusy(false);
    }
  };

  const showAccountMenu = menuOpen && !profileOpen;
  const menuLayout = useSidebarFooterMenuLayout(showAccountMenu, rootRef);

  useDismissibleLayer({
    open: showAccountMenu,
    refs: [rootRef, menuRef],
    onDismiss: () => setMenuOpen(false),
  });

  const authenticated = status === 'authenticated' && Boolean(session?.user);

  useDismissibleLayer({
    open: profileOpen && Boolean(authenticated),
    refs: [panelRef],
    onDismiss: () => setProfileOpen(false),
  });

  useEffect(() => {
    if (isSidebarCollapsed) {
      setMenuOpen(false);
      setProfileOpen(false);
    }
  }, [isSidebarCollapsed]);

  const loading = status === 'loading';
  const planLabel = isPro ? billing.proPlanName : planName || billing.freePlanName;
  const menuPlanLabel = isPro ? billing.proPlanName : billing.freePlanName;
  const limitText =
    typeof librariesCount === 'number' && typeof librariesLimit === 'number'
      ? `${librariesCount}/${librariesLimit}`
      : null;
  const limitReached =
    typeof librariesCount === 'number' && typeof librariesLimit === 'number' ? librariesCount >= librariesLimit : false;

  const planBlurb = isPro
    ? 'Расширенные лимиты, своё значение шкалы Waterfall и без лимита шрифтов в «Поделиться».'
    : typeof librariesLimit === 'number'
      ? `До ${librariesLimit} библиотек, ${FREE_STATIC_GENERATIONS_LIMIT} генераций VF → статик в месяц, до ${MAX_SHARE_FONTS_FREE} шрифтов в ссылке «Поделиться». Waterfall — только пресеты шкалы.`
      : 'Лимиты тарифа Free: библиотеки, генерации, «Поделиться», Waterfall — пресеты шкалы.';

  const accountTriggerTooltip = loading
    ? 'Загрузка сессии…'
    : authenticated
      ? 'Аккаунт'
      : 'Войти в аккаунт';

  const displayName =
    authenticated && session.user?.name
      ? String(session.user.name).trim()
      : authenticated && session.user?.email
        ? String(session.user.email).split('@')[0]
        : '';

  const sessionNameParts = authenticated && session?.user?.name ? String(session.user.name).trim().split(/\s+/) : [];
  const sessionFirst = sessionNameParts[0] || '';
  const sessionRest = sessionNameParts.slice(1).join(' ') || '';
  const profileDirty = firstName.trim() !== sessionFirst || lastName.trim() !== sessionRest;

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
    if (!profileOpen || !authenticated || typeof window === 'undefined') return;
    const uid = session?.user?.id;
    setFreeGenUsed(readFreeStaticGenerationsUsed(uid));
  }, [profileOpen, authenticated, session?.user?.id]);

  useEffect(() => {
    if (!authenticated || typeof window === 'undefined') return;
    const uid = session?.user?.id;
    const onStorage = (e) => {
      if (e.key && e.key.startsWith('dinamic-font:free-static-generations-used:')) {
        setFreeGenUsed(readFreeStaticGenerationsUsed(uid));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [authenticated, session?.user?.id]);

  useEffect(() => {
    if (!profileOpen || !authenticated || typeof window === 'undefined') return;
    const uid = session?.user?.id;
    const onFocus = () => setFreeGenUsed(readFreeStaticGenerationsUsed(uid));
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [profileOpen, authenticated, session?.user?.id]);

  useEffect(() => {
    if (!profileOpen || !authenticated || typeof document === 'undefined') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [profileOpen, authenticated]);

  const handleSignOut = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    void signOut({ callbackUrl: router.asPath || '/' });
  };

  const accountModal =
    profileOpen && authenticated && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[500] flex items-center justify-center bg-black/30 p-4"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setProfileOpen(false);
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
              <PopupDialogHeader title="Профиль" onClose={() => setProfileOpen(false)} closeAriaLabel="Закрыть" />

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4">
                    <p className="text-base font-semibold uppercase leading-tight text-gray-900">{planLabel}</p>
                    <p className="text-xs font-medium leading-snug tracking-wide text-gray-700">{planBlurb}</p>
                    <AppButton
                      type="button"
                      variant="outline"
                      size="sm"
                      fullWidth
                      className="mt-auto tracking-wide"
                      onClick={() => {
                        setProfileOpen(false);
                        openPlans?.();
                      }}
                    >
                      {billing.showPlans}
                    </AppButton>
                  </div>

                  {limitReached && !isPro ? (
                    <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4">
                      <p className="text-base font-semibold uppercase leading-snug tracking-wide text-gray-900">
                        Лимит библиотек достигнут
                      </p>
                      <p className="text-xs font-medium leading-snug text-gray-700">
                        {billing.upgradeHint}
                      </p>
                      <AppButton
                        type="button"
                        variant="accent"
                        size="sm"
                        fullWidth
                        className="mt-4 tracking-wide"
                        onClick={() => {
                          setProfileOpen(false);
                          openPlans?.();
                        }}
                      >
                        Улучшить до Pro
                      </AppButton>
                    </div>
                  ) : (
                    <div className="hidden rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 sm:flex sm:flex-col sm:justify-center">
                      <p className="flex flex-col gap-1.5 text-center text-[10px] font-semibold uppercase leading-relaxed tracking-wide text-gray-500">
                        {limitText ? (
                          <>
                            <span>
                              Библиотеки: <span className="tabular-nums text-gray-800">{limitText}</span>
                            </span>
                            {!isPro ? (
                              <>
                                <span>
                                  Генерация:{' '}
                                  <span className="tabular-nums text-gray-800">
                                    {Math.max(0, FREE_STATIC_GENERATIONS_LIMIT - freeGenUsed)}/{FREE_STATIC_GENERATIONS_LIMIT}
                                  </span>
                                </span>
                                <span>
                                  Поделиться:{' '}
                                  <span className="tabular-nums text-gray-800">до {MAX_SHARE_FONTS_FREE} в ссылке</span>
                                </span>
                                <span className="text-gray-600">Waterfall: пресеты шкалы</span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-600">Генерация: без лимита</span>
                                <span className="text-gray-600">Поделиться: без лимита</span>
                                <span className="text-gray-600">Waterfall: своё значение шкалы</span>
                              </>
                            )}
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

                <div className="mt-4">
                  <LabeledDivider>Ещё</LabeledDivider>
                  <div className="space-y-0 overflow-hidden bg-white">
                    <div className="flex min-h-[3.25rem] items-center justify-between gap-4 pl-4 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-900">
                        Выйти из аккаунта
                      </span>
                      <AppButton
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 tracking-wide"
                        onClick={handleSignOut}
                      >
                        Выйти
                      </AppButton>
                    </div>
                  </div>
                  <ProfileDangerExpander
                    onDelete={() => {
                      setDeleteConfirmOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const accountMenuPortal =
    menuLayout && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role={authenticated ? 'menu' : 'dialog'}
            aria-label={authenticated ? 'Меню аккаунта' : 'Вход в аккаунт'}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
            style={{
              position: 'fixed',
              left: menuLayout.left,
              width: menuLayout.width,
              bottom: menuLayout.bottom,
              zIndex: 450,
            }}
          >
            {authenticated ? (
              <div>
                <div className="border-b border-gray-100 px-4 py-4">
                  {displayName || session.user.email ? (
                    <div className="flex min-w-0 items-baseline gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-gray-900">
                        {displayName || session.user.email}
                      </p>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">
                        {menuPlanLabel}
                      </span>
                    </div>
                  ) : null}
                  {session.user.email && displayName ? (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{session.user.email}</p>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-sm border border-gray-200 bg-white text-xs font-semibold text-gray-900 transition-colors hover:border-accent hover:bg-accent hover:text-white"
                    onClick={() => {
                      setMenuOpen(false);
                      openPlans?.();
                    }}
                  >
                    <EditAssetIcon src={updateIconUrl} className="h-3.5 w-3.5" />
                    {billing.menuButton}
                  </button>
                </div>

                <div className="px-2 py-2">
                  <AccountMenuItem
                    icon={<EditAssetIcon src={userIconUrl} className="h-4 w-4" />}
                    onClick={() => {
                      setMenuOpen(false);
                      setProfileOpen(true);
                    }}
                  >
                    Профиль
                  </AccountMenuItem>
                </div>

                <div className="border-t border-gray-100 px-2 py-2">
                  <AccountMenuItem
                    icon={<EditAssetIcon src={loginIconUrl} className="h-4 w-4 -scale-x-100" />}
                    onClick={handleSignOut}
                  >
                    Выйти
                  </AccountMenuItem>
                </div>
              </div>
            ) : loading ? (
              <p className="px-4 py-6 text-center text-xs uppercase text-gray-500">Загрузка…</p>
            ) : (
              <div className="flex flex-col gap-3 p-4">
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
                    setMenuOpen(false);
                    void router.push('/auth/signin');
                  }}
                >
                  Полная страница входа
                </AppButton>
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
    <div
      ref={rootRef}
      className={`relative flex items-center justify-center ${isSidebarCollapsed ? '' : 'h-full min-h-0 w-full'}`}
    >
      <Tooltip
        content={accountTriggerTooltip}
        as="div"
        className={isSidebarCollapsed ? 'flex w-full justify-center' : 'flex h-full min-h-0 w-full min-w-0'}
      >
        <AppButton
          type="button"
          variant="toolbarIcon"
          pressed={menuOpen || profileOpen}
          size={isSidebarCollapsed ? 'icon' : 'rail'}
          className={isSidebarCollapsed ? 'group' : 'group w-full overflow-hidden'}
          onClick={() => {
            if (loading) return;
            if (!authenticated) {
              setMenuOpen(false);
              void router.push({
                pathname: '/auth/signin',
                query: { callbackUrl: router.asPath || '/' },
              });
              return;
            }
            setMenuOpen((v) => !v);
          }}
          aria-label={authenticated ? 'Аккаунт' : 'Войти'}
          aria-expanded={authenticated ? menuOpen : undefined}
          aria-haspopup={authenticated ? 'menu' : undefined}
        >
          <AccountTriggerAvatar authenticated={authenticated} loading={loading} session={session} />
        </AppButton>
      </Tooltip>

      {accountMenuPortal}
      {accountModal}
    </div>

    <AccountDeleteConfirmModal
      open={deleteConfirmOpen}
      busy={deleteBusy}
      onClose={() => {
        if (!deleteBusy) setDeleteConfirmOpen(false);
      }}
      onConfirm={handleConfirmDeleteAccount}
    />
    <AccountDeletedSuccessModal
      open={deleteSuccessOpen}
      recoverableUntil={recoverableUntil}
      onClose={() => setDeleteSuccessOpen(false)}
    />
    </>
  );
}
