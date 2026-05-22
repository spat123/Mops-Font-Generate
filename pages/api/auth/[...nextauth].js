import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getMaxSavedLibrariesForUser } from '../../../utils/authLibraryLimits';
import { upsertOAuthUser, verifyCredentialsUser, findUserByEmail, findUserById } from '../../../lib/auth/userStore';
import { matchEnvCredentialsUser } from '../../../lib/auth/envCredentialsLogin';
import { consumeLoginToken, isStepUpLoginDisabled } from '../../../lib/auth/stepUpLogin';

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
  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
  const googleClientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  if (googleClientId && googleClientSecret) {
    list.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    );
  }
  list.push(
    CredentialsProvider({
      name: 'Логин и пароль',
      credentials: {
        email: { label: 'Логин или email', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
        loginToken: { label: 'Login token', type: 'text' },
      },
      async authorize(credentials) {
        const loginToken = String(credentials?.loginToken ?? '').trim();
        if (loginToken) {
          const userId = await consumeLoginToken(loginToken);
          if (!userId) return null;
          const user = await findUserById(userId);
          if (!user) return null;
          return {
            id: user.id,
            name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
            email: user.email || null,
            image: user.image || null,
          };
        }

        const login = String(credentials?.email ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!login || !password) return null;

        if (!isStepUpLoginDisabled()) {
          return null;
        }

        const user = await verifyCredentialsUser({ email: login, password });
        if (user) {
          return {
            id: user.id,
            name: user.name || (user.email ? user.email.split('@')[0] : 'User'),
            email: user.email || null,
            image: user.image || null,
          };
        }

        const demoUser = matchEnvCredentialsUser({ email: login, password });
        if (demoUser) {
          return {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            image: demoUser.image,
          };
        }

        return null;
      },
    }),
  );
  const yandexClientId = String(process.env.YANDEX_CLIENT_ID || '').trim();
  const yandexClientSecret = String(process.env.YANDEX_CLIENT_SECRET || '').trim();
  if (yandexClientId && yandexClientSecret) {
    // Кастомный провайдер: любая ошибка тут роняет NextAuth целиком (providers/csrf/session).
    // Поэтому делаем максимально "безопасную" инициализацию.
    try {
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
        clientId: yandexClientId,
        clientSecret: yandexClientSecret,
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
    } catch (e) {
      console.error('[nextauth] yandex provider init failed:', e);
    }
  }
  return list;
}

function safeBuildProviders() {
  try {
    const providers = buildProviders();
    if (Array.isArray(providers) && providers.length > 0) return providers;
  } catch (e) {
    console.error('[nextauth] buildProviders failed:', e);
  }
  // Минимальный fallback: не даём NextAuth упасть даже если env/провайдер сломан.
  return [
    CredentialsProvider({
      name: 'Логин и пароль',
      credentials: {
        email: { label: 'Логин или email', type: 'text' },
        password: { label: 'Пароль', type: 'password' },
        loginToken: { label: 'Login token', type: 'text' },
      },
      async authorize() {
        return null;
      },
    }),
  ];
}

export const authOptions = {
  /** ONREZA / VPS за reverse proxy: без этого session → 500 и HTML вместо JSON. */
  trustHost: true,
  providers: safeBuildProviders(),
  pages: {
    signIn: '/auth/signin',
  },
  debug: String(process.env.NEXTAUTH_DEBUG || '').trim() === '1',
  logger: {
    error(code, metadata) {
      console.error('[nextauth][error]', code, metadata);
    },
    warn(code) {
      console.warn('[nextauth][warn]', code);
    },
    debug(code, metadata) {
      if (String(process.env.NEXTAUTH_DEBUG || '').trim() === '1') {
        console.debug('[nextauth][debug]', code, metadata);
      }
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.provider) {
        token.provider = account.provider;
      }
      if (account && user) {
        if (account.provider === 'credentials') {
          try {
            const rec = user.email ? await findUserByEmail(user.email) : null;
            token.provider = 'credentials';
            token.userId = rec?.id || user.id || token.sub;
            token.accountCreatedAt = rec?.createdAt || null;
          } catch (err) {
            console.error('[nextauth] jwt credentials db:', err);
            token.provider = 'credentials';
            token.userId = user.id || token.sub;
            token.accountCreatedAt = null;
          }
          token.needsLink = false;
          token.pendingLink = null;
        } else {
          try {
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
              try {
                const rec = await upsertOAuthUser({
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  email: user.email,
                  name: user.name,
                  image: user.image,
                });
                token.userId = rec?.id || user.id || token.sub;
                token.accountCreatedAt = rec?.createdAt || null;
              } catch (err) {
                console.error('[nextauth] upsertOAuthUser failed:', err);
                const provider = String(account.provider || 'oauth').trim();
                const accountId = String(account.providerAccountId || user.id || token.sub || '').trim();
                token.userId = accountId ? `${provider}:${accountId}` : token.sub;
                token.accountCreatedAt = new Date().toISOString();
              }
            }
          } catch (err) {
            console.error('[nextauth] jwt oauth db:', err);
            const provider = String(account.provider || 'oauth').trim();
            const accountId = String(account.providerAccountId || user.id || token.sub || '').trim();
            token.userId = accountId ? `${provider}:${accountId}` : token.sub;
            token.accountCreatedAt = new Date().toISOString();
            token.needsLink = false;
            token.pendingLink = null;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId || session.user.id;
        session.user.accountCreatedAt = token.accountCreatedAt || null;
        session.user.needsLink = Boolean(token.needsLink);
        session.user.pendingLink = token.pendingLink || null;
        const createdAtMs = token.accountCreatedAt ? Date.parse(token.accountCreatedAt) : NaN;
        const ageDays = Number.isFinite(createdAtMs) ? Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60 * 24)) : null;
        session.user.accountAgeDays = ageDays;

        let plan = 'free';
        let dbProvider = null;
        const uid = token.userId != null ? String(token.userId) : '';
        if (uid && !uid.startsWith('pending:')) {
          try {
            const rec = await findUserById(uid);
            plan = String(rec?.plan || '').toLowerCase() === 'pro' ? 'pro' : 'free';
            dbProvider = rec?.provider || null;
          } catch {
            plan = 'free';
          }
        }
        session.user.provider = dbProvider || token.provider || null;

        // Возраст аккаунта Google через OAuth API недоступен — не блокируем по дате записи в нашей БД.
        if (session.user.needsLink) {
          session.user.canCreateLibraries = false;
          session.user.canCreateLibrariesReason = 'Подтвердите привязку аккаунта, чтобы продолжить.';
        } else {
          session.user.canCreateLibraries = true;
          session.user.canCreateLibrariesReason = null;
        }
        session.user.plan = plan;
        session.user.isPro = plan === 'pro';

        applyDevProSimulation(session);
        session.user.maxLibraries = getMaxSavedLibrariesForUser(Boolean(session.user.isPro));
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET?.trim() || undefined,
};

const nextAuthHandler = NextAuth(authOptions);

export default async function handler(req, res) {
  try {
    return await nextAuthHandler(req, res);
  } catch (err) {
    console.error('[nextauth] fatal handler error:', err);
    if (res.headersSent) return;
    const message = (err?.message || String(err)).slice(0, 800);
    res.status(500).json({
      error: 'NEXTAUTH_FATAL',
      message,
      name: err?.name || null,
      code: err?.code || null,
      runtime: process.versions?.bun ? 'bun' : 'node',
      path: req?.url || null,
    });
  }
}
