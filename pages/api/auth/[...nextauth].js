import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MAX_SAVED_LIBRARIES_PER_ACCOUNT } from '../../../utils/authLibraryLimits';

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
    jwt({ token, account }) {
      if (account?.provider) {
        token.provider = account.provider;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.provider = token.provider;
        session.user.maxLibraries = MAX_SAVED_LIBRARIES_PER_ACCOUNT;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
