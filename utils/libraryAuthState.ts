import type { Session } from 'next-auth';

/** Сессия уже есть (Google/OAuth), но useSession ещё в loading — не блокируем UI. */
export function resolveLibraryAuthState(authStatus: string, session: Session | null | undefined) {
  const user = session?.user;
  const hasUser = Boolean(user && (user.id || user.email));
  const needsLink = user?.needsLink === true;
  const canCreateFromSession = user?.canCreateLibraries !== false;

  const isAuthenticated =
    authStatus === 'authenticated' || (hasUser && authStatus !== 'unauthenticated');
  const authLoading = authStatus === 'loading' && !hasUser;

  return {
    hasUser,
    needsLink,
    canCreateFromSession,
    isAuthenticated,
    authLoading,
  };
}
