import type { GetServerSideProps } from 'next';
import React from 'react';
import type { AuthPageProps } from '../../types/authPages';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { NoIndexHead } from '../../components/seo/NoIndexHead';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import {
  AUTH_FORM_ERROR_CLASS,
  AUTH_FORM_SUCCESS_CLASS,
  AUTH_INPUT_CLASS,
  AuthSubmitButton,
  AuthLegalFooter,
  AuthLogoLink,
  AuthSplitLayout,
} from '../../components/auth/AuthSplitLayout';

export const getServerSideProps: GetServerSideProps<AuthPageProps> = async ({ req }) => {
  return { props: { isRuGeo: getIsRuGeoFromHeaders(req) } };
};

export default function AuthForgotPasswordPage({ isRuGeo = false }: AuthPageProps) {
  const router = useRouter();
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';
  const [email, setEmail] = React.useState('');
  React.useEffect(() => {
    if (!router.isReady) return;
    const q = typeof router.query?.email === 'string' ? router.query.email.trim().toLowerCase() : '';
    if (q) setEmail(q);
  }, [router.isReady, router.query?.email]);
  const [formError, setFormError] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);

  const signInHref = { pathname: '/auth/signin', query: { callbackUrl } };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const trimmed = String(email || '').trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setFormError('Введите корректный email.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        setFormError('Не удалось отправить запрос. Попробуйте позже.');
        return;
      }
      setSent(true);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Восстановление пароля — DINAMIC FONT</title>
      </Head>
      <NoIndexHead />
      <AuthSplitLayout isRuGeo={isRuGeo} footer={<AuthLegalFooter />}>
        <AuthLogoLink className="mb-10" />

        <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">
          Восстановление пароля
        </h1>
        <p className="mt-4 text-center text-sm leading-relaxed text-gray-600">
          {sent
            ? 'Если аккаунт с этим email зарегистрирован по паролю, мы отправили ссылку для сброса. Проверьте входящие и «Спам».'
            : 'Укажите email — пришлём ссылку для задания нового пароля (действует 1 час).'}
        </p>

        {sent ? (
          <p className={`mt-6 ${AUTH_FORM_SUCCESS_CLASS}`}>Письмо отправлено, если аккаунт найден.</p>
        ) : (
          <form className="mt-8 flex flex-col gap-3" onSubmit={onSubmit}>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={AUTH_INPUT_CLASS}
              placeholder="EMAIL"
              disabled={submitting}
            />
            {formError ? <p className={AUTH_FORM_ERROR_CLASS}>{formError}</p> : null}
            <AuthSubmitButton loading={submitting}>Отправить ссылку</AuthSubmitButton>
          </form>
        )}

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          <Link
            href={signInHref}
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            Вернуться ко входу
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
