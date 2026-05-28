/**
 * Один переход после auth — без гонки router.replace (Next: "Loading initial props cancelled").
 */
export function redirectAfterAuth(path: string): void {
  if (typeof window === 'undefined') return;
  const url = String(path || '/').trim() || '/';
  const target = url.startsWith('/') ? url : '/';
  window.location.assign(target);
}

export function redirectAfterAuthQuery(
  pathname: string,
  query: Record<string, string | number | null | undefined> = {},
): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  redirectAfterAuth(qs ? `${pathname}?${qs}` : pathname);
}
