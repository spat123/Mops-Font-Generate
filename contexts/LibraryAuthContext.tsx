import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { LibraryAuthContextValue } from '../types/libraryAuthContext';

const defaultValue: LibraryAuthContextValue = {
  authLoading: false,
  isAuthenticated: false,
  canCreateNewLibrary: false,
  libraryLimitReached: false,
  isPro: false,
  planName: 'Free',
  librariesCount: 0,
  librariesLimit: 3,
  requestSignIn: () => {},
  openPlans: () => {},
  assertCanCreateNewLibrary: () => false,
};

const LibraryAuthContext = createContext<LibraryAuthContextValue>(defaultValue);

export function LibraryAuthProvider({
  value,
  children,
}: {
  value?: Partial<LibraryAuthContextValue>;
  children: ReactNode;
}) {
  const merged = useMemo(() => ({ ...defaultValue, ...value }), [value]);
  return <LibraryAuthContext.Provider value={merged}>{children}</LibraryAuthContext.Provider>;
}

export function useLibraryAuth(): LibraryAuthContextValue {
  return useContext(LibraryAuthContext);
}
