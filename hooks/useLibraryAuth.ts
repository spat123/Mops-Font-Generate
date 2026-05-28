import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { Session } from 'next-auth';
import { signIn } from 'next-auth/react';
import { toast } from '../utils/appNotify';
import { getMaxSavedLibrariesForUser } from '../utils/authLibraryLimits';
import { getBillingCopy } from '../utils/billingCopy';
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

  useEffect(() => {
    if (!needsLink) {
      needsLinkToastShownRef.current = false;
      return;
    }
    if (typeof window === 'undefined') return;
    const path = router.pathname || '';
    if (path === '/auth/link' || path.startsWith('/auth/')) return;
    if (!needsLinkToastShownRef.current) {
      needsLinkToastShownRef.current = true;
      toast.info('Подтвердите привязку аккаунта');
    }
    if (path !== '/auth/link') {
      void router.push('/auth/link');
    }
  }, [needsLink, router.pathname, router]);

  const assertCanCreateNewLibrary = useCallback(() => {
    if (authStatus === 'loading') {
      toast.info('Проверка входа…');
      return false;
    }
    if (authStatus !== 'authenticated') {
      toast.info('Войдите, чтобы создавать библиотеки');
      requestSignIn();
      return false;
    }
    if (needsLink) {
      toast.info('Подтвердите привязку аккаунта');
      void router.push('/auth/link');
      return false;
    }
    const maxLibs = getMaxSavedLibrariesForUser(Boolean(session?.user?.isPro));
    if (fontLibraries.length >= maxLibs) {
      toast.info(getBillingCopy().librariesLimitToast);
      openPlans();
      return false;
    }
    return true;
  }, [
    authStatus,
    fontLibraries.length,
    requestSignIn,
    session?.user?.isPro,
    needsLink,
    router,
    openPlans,
  ]);

  const libraryAuthValue = useMemo(() => {
    const isPro = Boolean(session?.user?.isPro);
    const maxLibs = getMaxSavedLibrariesForUser(isPro);
    const librariesCount = fontLibraries.length;
    const libraryLimitReached =
      authStatus === 'authenticated' && librariesCount >= maxLibs;
    return {
      authLoading: authStatus === 'loading',
      isAuthenticated: authStatus === 'authenticated',
      isPro,
      planName: session?.user?.plan === 'pro' ? 'Pro' : 'Free',
      librariesCount,
      librariesLimit: maxLibs,
      libraryLimitReached,
      canCreateNewLibrary:
        authStatus === 'authenticated' && !needsLink && !libraryLimitReached,
      requestSignIn,
      openPlans,
      assertCanCreateNewLibrary,
    };
  }, [
    authStatus,
    fontLibraries.length,
    requestSignIn,
    assertCanCreateNewLibrary,
    session?.user?.isPro,
    session?.user?.plan,
    needsLink,
    openPlans,
  ]);

  return {
    libraryAuthValue,
    isPlansOpen,
    setIsPlansOpen,
    assertCanCreateNewLibrary,
  };
}
