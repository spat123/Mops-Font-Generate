import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getMaxSavedLibrariesForUser } from '../../../utils/authLibraryLimits';
import { upsertOAuthUser, verifyCredentialsUser, findUserByEmail, findUserById } from '../../../lib/auth/userStore';

/** Только локальная разработка: поднять тариф до Pro без правки БД. */
function applyDevProSimulation(session) {
  if (process.env.NODE_ENV !== 'development') return;
  const u = session?.user;
  if (!u) return;

  if (String(process.env.DEV_PRO_SIMULATION || '').trim() === '1') {
    u.plan = 'pro';
    u.isPro = true;
    return;
  }

  const emails = String(process.env.DEV_PRO_EMAILS || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = String(u.email || '')
    .trim()
    .toLowerCase();
  if (userEmail && emails.includes(userEmail)) {
    u.plan = 'pro';
    u.isPro = true;
    return;
  }

  const ids = String(process.env.DEV_PRO_USER_IDS || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const uid = String(u.id || '').trim();
  if (uid && ids.includes(uid)) {
    u.plan = 'pro';
    u.isPro = true;
  }
}

function buildProviders() {
  const list = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    list.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }
  list.push(
    CredentialsProvider({
      name: 'Логин и пароль',
      credentials: {
        email: { label: 'Логин или email', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
      },
      async authorize(credentials) {
        const login = String(credentials?.email ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!login || !password) return null;

        const user = await verifyCredentialsUser({ email: login, password });
        if (user) {
          return {
            id: user.id,
            name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
            email: user.email || null,
            image: user.image || null,
          };
        }

        if (process.env.AUTH_CREDENTIALS_LOGIN && process.env.AUTH_CREDENTIALS_PASSWORD) {
          if (
            login === String(process.env.AUTH_CREDENTIALS_LOGIN) &&
            password === String(process.env.AUTH_CREDENTIALS_PASSWORD)
          ) {
            const looksLikeEmail = login.includes('@');
            return {
              id: `credentials:${login}`,
              name: looksLikeEmail ? login.split('@')[0] : login,
              email: looksLikeEmail ? login : null,
              image: null,
            };
          }
        }

        return null;
      },
    }),
  );
  if (process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET) {
    list.push({
      id: 'yandex',
      name: 'Яндекс',
      type: 'oauth',
      version: '2.0',
      authorization: {
        url: 'https://oauth.yandex.ru/authorize',
        params: {
          scope: 'login:info login:email',
          response_type: 'code',
        },
      },
      token: 'https://oauth.yandex.ru/token',
      userinfo: 'https://login.yandex.ru/info?format=json',
      client: {
        token_endpoint_auth_method: 'client_secret_post',
      },
      clientId: process.env.YANDEX_CLIENT_ID,
      clientSecret: process.env.YANDEX_CLIENT_SECRET,
      profile(profile) {
        const id = String(profile?.id ?? '');
        return {
          id,
          name: profile.display_name || profile.real_name || profile.login || 'Yandex',
          email: profile.default_email || null,
          image:
            profile.is_avatar_empty || !profile.default_avatar_id
              ? null
              : `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`,
        };
      },
    });
  }
  return list;
}

export const authOptions = {
  providers: buildProviders(),
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider) {
        token.provider = account.provider;
      }
      if (account && user) {
        if (account.provider === 'credentials') {
          const rec = user.email ? await findUserByEmail(user.email) : null;
          token.userId = rec?.id || user.id || token.sub;
          token.accountCreatedAt = rec?.createdAt || null;
          token.needsLink = false;
          token.pendingLink = null;
        } else {
          const email = user.email || null;
          const existing = email ? await findUserByEmail(email) : null;
          const alreadyLinked =
            existing &&
            Array.isArray(existing?.accounts) &&
            existing.accounts.some(
              (a) =>
                String(a?.provider || '').trim() === String(account.provider || '').trim() &&
                String(a?.providerAccountId || '').trim() === String(account.providerAccountId || '').trim(),
            );

          if (existing && !alreadyLinked && String(existing?.provider || '') === 'credentials') {
            token.needsLink = true;
            token.pendingLink = {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              email: email,
              name: user.name || null,
              image: user.image || null,
            };
            token.userId = `pending:${account.provider}:${account.providerAccountId}`;
            token.accountCreatedAt = existing.createdAt || null;
          } else {
            token.needsLink = false;
            token.pendingLink = null;
            const rec = await upsertOAuthUser({
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              email: user.email,
              name: user.name,
              image: user.image,
            });
            token.userId = rec?.id || user.id || token.sub;
            token.accountCreatedAt = rec?.createdAt || null;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.provider = token.provider;
        session.user.id = token.userId || session.user.id;
        session.user.accountCreatedAt = token.accountCreatedAt || null;
        session.user.needsLink = Boolean(token.needsLink);
        session.user.pendingLink = token.pendingLink || null;
        const createdAtMs = token.accountCreatedAt ? Date.parse(token.accountCreatedAt) : NaN;
        const ageDays = Number.isFinite(createdAtMs) ? Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24)) : null;
        session.user.accountAgeDays = ageDays;

        const minAgeDays = Number.parseInt(process.env.MIN_OAUTH_ACCOUNT_AGE_DAYS || '30', 10);
        const isOAuth = token.provider && token.provider !== 'credentials';
        if (session.user.needsLink) {
          session.user.canCreateLibraries = false;
          session.user.canCreateLibrariesReason = 'Подтвердите привязку аккаунта, чтобы продолжить.';
        } else if (isOAuth && Number.isFinite(minAgeDays) && minAgeDays > 0 && Number.isFinite(ageDays) && ageDays < minAgeDays) {
          session.user.canCreateLibraries = false;
          session.user.canCreateLibrariesReason = `Новые аккаунты смогут создавать библиотеки через ${minAgeDays - ageDays} дн.`;
        } else {
          session.user.canCreateLibraries = true;
          session.user.canCreateLibrariesReason = null;
        }

        let plan = 'free';
        const uid = token.userId != null ? String(token.userId) : '';
        if (uid && !uid.startsWith('pending:')) {
          try {
            const rec = await findUserById(uid);
            plan = String(rec?.plan || '').toLowerCase() === 'pro' ? 'pro' : 'free';
          } catch {
            plan = 'free';
          }
        }
        session.user.plan = plan;
        session.user.isPro = plan === 'pro';

        applyDevProSimulation(session);
        session.user.maxLibraries = getMaxSavedLibrariesForUser(Boolean(session.user.isPro));
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
