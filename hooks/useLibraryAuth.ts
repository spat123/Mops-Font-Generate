import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { Session } from 'next-auth';
import { signIn } from 'next-auth/react';
import { toast } from '../utils/appNotify';
import { getMaxSavedLibrariesForUser } from '../utils/authLibraryLimits';
import { getBillingCopy } from '../utils/billingCopy';
import { getOpenBetaPlanName, hasOpenBetaFullAccess } from '../utils/openBetaAccess';
import { resolveLibraryAuthState } from '../utils/libraryAuthState';
import type { SavedLibraryRecord } from '../types/editorFonts';

type UseLibraryAuthParams = {
  authStatus: string;
  session: Session | null;
  needsLink: boolean;
  fontLibraries: SavedLibraryRecord[];
};

/**
 * Auth-контекст библиотек: вход, лимиты, Pro, assertCanCreateNewLibrary.
 */
export function useLibraryAuth({ authStatus, session, needsLink, fontLibraries }: UseLibraryAuthParams) {
  const router = useRouter();
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const openPlans = useCallback(() => setIsPlansOpen(true), []);
  const needsLinkToastShownRef = useRef(false);

  const requestSignIn = useCallback(() => {
    if (typeof window === 'undefined') return;
    const callbackUrl = `${window.location.pathname}${window.location.search || ''}`;
    void signIn(undefined, { callbackUrl });
  }, []);

  const authState = resolveLibraryAuthState(authStatus, session);
  const needsLinkActive = authState.needsLink;

  useEffect(() => {
    if (!needsLinkActive) {
      needsLinkToastShownRef.current = false;
      return;
    }
    if (authState.authLoading) return;
    if (typeof window === 'undefined') return;
    const path = router.pathname || '';
    if (path === '/auth/link' || path.startsWith('/auth/')) return;
    if (!needsLinkToastShownRef.current) {
      needsLinkToastShownRef.current = true;
      const reason = session?.user?.canCreateLibrariesReason;
      toast.info(
        reason ||
          'Вы вошли через Google, но нужно подтвердить привязку к существующему аккаунту с этим email.',
      );
    }
  }, [authState.authLoading, needsLinkActive, router.pathname, session?.user?.canCreateLibrariesReason]);

  const assertCanCreateNewLibrary = useCallback(() => {
    if (authState.authLoading) {
      toast.info('Проверка входа…');
      return false;
    }
    if (!authState.isAuthenticated) {
      toast.info('Войдите, чтобы создавать библиотеки');
      requestSignIn();
      return false;
    }
    if (needsLinkActive || !authState.canCreateFromSession) {
      const reason = session?.user?.canCreateLibrariesReason;
      toast.info(
        reason ||
          'Подтвердите привязку аккаунта (вход через Google и пароль на один email).',
      );
      if (needsLinkActive) void router.push('/auth/link');
      return false;
    }
    const hasFullAccess = hasOpenBetaFullAccess({
      isAuthenticated: authState.isAuthenticated,
      isPro: Boolean(session?.user?.isPro),
    });
    const maxLibs = getMaxSavedLibrariesForUser(hasFullAccess);
    if (fontLibraries.length >= maxLibs) {
      toast.info(getBillingCopy().librariesLimitToast);
      openPlans();
      return false;
    }
    return true;
  }, [
    authState.authLoading,
    authState.canCreateFromSession,
    authState.isAuthenticated,
    fontLibraries.length,
    needsLinkActive,
    requestSignIn,
    router,
    session?.user?.canCreateLibrariesReason,
    session?.user?.isPro,
    openPlans,
  ]);

  const libraryAuthValue = useMemo(() => {
    const actualIsPro = Boolean(session?.user?.isPro);
    const isPro = hasOpenBetaFullAccess({
      isAuthenticated: authState.isAuthenticated,
      isPro: actualIsPro,
    });
    const maxLibs = getMaxSavedLibrariesForUser(isPro);
    const librariesCount = fontLibraries.length;
    const libraryLimitReached =
      authState.isAuthenticated && librariesCount >= maxLibs;
    return {
      authLoading: authState.authLoading,
      isAuthenticated: authState.isAuthenticated,
      isPro,
      planName: getOpenBetaPlanName({
        isAuthenticated: authState.isAuthenticated,
        isPro: actualIsPro || session?.user?.plan === 'pro',
      }),
      librariesCount,
      librariesLimit: maxLibs,
      libraryLimitReached,
      canCreateNewLibrary:
        authState.isAuthenticated &&
        !needsLinkActive &&
        authState.canCreateFromSession &&
        !libraryLimitReached,
      requestSignIn,
      openPlans,
      assertCanCreateNewLibrary,
    };
  }, [
    assertCanCreateNewLibrary,
    authState.authLoading,
    authState.canCreateFromSession,
    authState.isAuthenticated,
    fontLibraries.length,
    needsLinkActive,
    openPlans,
    requestSignIn,
    session?.user?.isPro,
    session?.user?.plan,
  ]);

  return {
    libraryAuthValue,
    isPlansOpen,
    setIsPlansOpen,
    assertCanCreateNewLibrary,
  };
}
