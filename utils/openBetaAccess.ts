export function isOpenBetaFullAccessEnabled(): boolean {
  const raw = String(
    process.env.NEXT_PUBLIC_OPEN_BETA_FULL_ACCESS ??
      process.env.OPEN_BETA_FULL_ACCESS ??
      '1',
  ).trim();
  return raw !== '0' && raw.toLowerCase() !== 'false';
}

export function hasOpenBetaFullAccess({
  isAuthenticated = false,
  isPro = false,
}: {
  isAuthenticated?: boolean;
  isPro?: boolean;
} = {}): boolean {
  return Boolean(isPro) || (isOpenBetaFullAccessEnabled() && Boolean(isAuthenticated));
}

export function getOpenBetaPlanName({
  isAuthenticated = false,
  isPro = false,
}: {
  isAuthenticated?: boolean;
  isPro?: boolean;
} = {}): string {
  if (isPro) return 'Pro';
  if (isOpenBetaFullAccessEnabled() && isAuthenticated) return 'Beta';
  return 'Free';
}
