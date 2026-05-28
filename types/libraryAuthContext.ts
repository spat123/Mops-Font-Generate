export type LibraryAuthContextValue = {
  authLoading: boolean;
  isAuthenticated: boolean;
  canCreateNewLibrary: boolean;
  libraryLimitReached: boolean;
  isPro: boolean;
  planName: string;
  librariesCount: number;
  librariesLimit: number;
  requestSignIn: () => void;
  openPlans: () => void;
  assertCanCreateNewLibrary: () => boolean;
};
