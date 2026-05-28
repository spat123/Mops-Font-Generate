import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isPro?: boolean;
      plan?: string;
      needsLink?: boolean;
      pendingLink?: {
        provider?: string;
        providerAccountId?: string;
        email?: string;
        name?: string | null;
        image?: string | null;
      } | null;
      accountCreatedAt?: string | null;
      accountAgeDays?: number | null;
      provider?: string | null;
      canCreateLibraries?: boolean;
      canCreateLibrariesReason?: string | null;
      maxLibraries?: number;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    provider?: string;
    accountCreatedAt?: string | null;
    needsLink?: boolean;
    pendingLink?: Session['user'] extends { pendingLink?: infer P } ? P : null;
  }
}
