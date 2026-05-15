import React, { createContext, useContext, useMemo } from 'react';

const defaultValue = {
  authLoading: false,
  isAuthenticated: false,
  canCreateNewLibrary: false,
  isPro: false,
  planName: 'Free',
  librariesCount: 0,
  librariesLimit: 3,
  requestSignIn: () => {},
  openPlans: () => {},
  assertCanCreateNewLibrary: () => false,
};

const LibraryAuthContext = createContext(defaultValue);

export function LibraryAuthProvider({ value, children }) {
  const merged = useMemo(() => ({ ...defaultValue, ...value }), [value]);
  return <LibraryAuthContext.Provider value={merged}>{children}</LibraryAuthContext.Provider>;
}

export function useLibraryAuth() {
  return useContext(LibraryAuthContext);
}
