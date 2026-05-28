import type { GetServerSideProps } from 'next';
import React, { useEffect } from 'react';
import type { AuthPageProps, DeletedRecoverState } from '../../types/authPages';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { markHasSignedInBefore } from '../../utils/authReturningUser';
import { redirectAfterAuth, redirectAfterAuthQuery } from '../../utils/authRedirect';
import { completeRegistrationSignIn } from '../../utils/completeRegistrationSignIn';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from '../../components/auth/SignInProviderButtons';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import {
  AUTH_CODE_INPUT_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_FORM_ERROR_CLASS,
  AUTH_FORM_SUCCESS_CLASS,
  AuthDividerOr,
  AuthSubmitButton,
  AuthLegalFooter,
  AuthLogoLink,
  AuthSplitLayout,
} from '../../components/auth/AuthSplitLayout';
import { formatRecoveryDeadlineRu } from '../../lib/auth/accountDeletion';

export const getServerSideProps: GetServerSideProps<AuthPageProps> = async ({ req }) => {
  return { props: { isRuGeo: getIsRuGeoFromHeaders(req) } };
};

export default function AuthSignUpPage({ isRuGeo = false }: AuthPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordRepeat, setPasswordRepeat] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [formMessage, setFormMessage] = React.useState('');
  const [deletedRecover, setDeletedRecover] = React.useState<DeletedRecoverState | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [phase, setPhase] = React.useState<'form' | 'verify'>('form');
  const [pendingEmail, setPendingEmail] = React.useState('');
  const [verifyCode, setVerifyCode] = React.useState('');
  const submittingRef = React.useRef(false);

  const restoreDeletedAccount = async () => {
    if (submittingRef.current) return;
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const p1 = String(password || '');
    if (!trimmedEmail || !p1) {
      setFormError('Введите email и пароль от удалённого аккаунта.');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/auth/restore-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: p1 }),
      });
      if (!res.ok) {
        setFormError('Не удалось восстановить. Проверьте пароль или срок восстановления (6 месяцев).');
        return;
      }
      setDeletedRecover(null);
      void router.replace({ pathname: '/auth/signin', query: { verified: '1', callbackUrl } });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.user?.needsLink) {
      redirectAfterAuthQuery('/auth/link', { callbackUrl });
      return;
    }
    redirectAfterAuth(callbackUrl);
  }, [status, session?.user?.needsLink, callbackUrl]);

  return (
    <>
      <Head>
        <title>Регистрация — DINAMIC FONT</title>
      </Head>
      <AuthSplitLayout isRuGeo={isRuGeo} footer={<AuthLegalFooter />}>
        <AuthLogoLink className="mb-10" />

        <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">Регистрация</h1>
        <p className="mt-2 text-center text-sm font-normal text-gray-500">Добро пожаловать!</p>

        <div className="mt-8 flex flex-col gap-2">
          <SignInProviderButtons callbackUrl={callbackUrl} appearance="auth" />
        </div>

        <div className="mt-6">
          <AuthDividerOr />
        </div>

        {phase === 'verify' ? (
          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (submittingRef.current || !pendingEmail) return;
              submittingRef.current = true;
              setFormError('');
              setFormMessage('');
              setSubmitting(true);
              try {
                const digits = String(verifyCode || '').replace(/\D/g, '');
                if (digits.length !== 6) {
                  setFormError('Введите 6 цифр из письма «Подтвердите email».');
                  return;
                }
                const res = await fetch('/api/auth/verify-code', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'same-origin',
                  body: JSON.stringify({ email: pendingEmail, code: digits }),
                });
                const data = await res.json().catch(() => ({}));
                if (res.status === 400 && data?.code === 'TOKEN_EXPIRED') {
                  setFormError('Код устарел. Запросите новое письмо.');
                  return;
                }
                if (res.status === 404 && data?.code === 'NOT_FOUND') {
                  setFormError(
                    data?.error ||
                      'Аккаунт не найден на сервере. На Timeweb без DATABASE_URL регистрация может не сохраняться. Настройте DATABASE_URL и зарегистрируйтесь заново.',
                  );
                  return;
                }
                if (!res.ok) {
                  if (res.status >= 500) {
                    setFormError(
                      'Ошибка сервера при проверке кода. Обновите страницу — почта могла уже подтвердиться, тогда войдите с паролем.',
                    );
                    return;
                  }
                  if (data?.code === 'INVALID_CODE') {
                    setFormError('Неверный код. Проверьте письмо «Подтвердите email» или запросите новый.');
                    return;
                  }
                  setFormError('Не удалось подтвердить код. Попробуйте ещё раз.');
                  return;
                }
                const signInResult = await completeRegistrationSignIn({
                  email: pendingEmail,
                  password,
                  loginToken: data?.loginToken,
                  callbackUrl,
                });
                if (signInResult.ok) {
                  markHasSignedInBefore();
                  redirectAfterAuth(callbackUrl);
                  return;
                }
                if (signInResult.reason === 'step-up') {
                  setFormError(
                    'Почта подтверждена. На сервере включён код при входе с нового устройства — войдите с паролем (может прийти «Код для входа»).',
                  );
                } else {
                  setFormError(
                    data?.hint ||
                      'Почта подтверждена, но автоматический вход не удался. Войдите с тем же email и паролем.',
                  );
                }
                redirectAfterAuthQuery('/auth/signin', { verified: '1', callbackUrl });
              } finally {
                submittingRef.current = false;
                setSubmitting(false);
              }
            }}
          >
            <p className="text-center text-sm text-gray-600">
              Код отправлен на <span className="font-semibold text-gray-900">{pendingEmail}</span>. Введите его ниже —
              после подтверждения вы сразу войдёте в аккаунт.
            </p>
            <input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className={AUTH_CODE_INPUT_CLASS}
              disabled={submitting}
            />
            {formError ? <p className={AUTH_FORM_ERROR_CLASS}>{formError}</p> : null}
            {formMessage ? <p className={AUTH_FORM_SUCCESS_CLASS}>{formMessage}</p> : null}
            <AuthSubmitButton loading={submitting}>Подтвердить и войти</AuthSubmitButton>
            <Link
              href={{
                pathname: '/auth/check-email',
                query: { email: pendingEmail, callbackUrl },
              }}
              className="text-center text-xs font-medium text-gray-600 underline underline-offset-2"
            >
              Отправить код снова
            </Link>
          </form>
        ) : (
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (submittingRef.current) return;
            submittingRef.current = true;
            setFormError('');
            setDeletedRecover(null);
            try {
              const trimmedName = String(name || '').trim();
              const trimmedEmail = String(email || '').trim().toLowerCase();
              const p1 = String(password || '');
              const p2 = String(passwordRepeat || '');
              if (!trimmedName) {
                setFormError('Введите имя.');
                return;
              }
              if (!trimmedEmail || !trimmedEmail.includes('@')) {
                setFormError('Введите корректную электронную почту.');
                return;
              }
              if (!p1 || p1.length < 6) {
                setFormError('Пароль должен быть не короче 6 символов.');
                return;
              }
              if (p1 !== p2) {
                setFormError('Пароли не совпадают.');
                return;
              }

              const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password: p1 }),
              });
              const data = await res.json().catch(() => ({}));
              const emailForCheck = data?.email || trimmedEmail;

              if (res.status === 409 && data?.code === 'DELETED_RECOVERABLE') {
                setDeletedRecover({
                  email: data.email || trimmedEmail,
                  recoverableUntil: data.recoverableUntil || null,
                });
                return;
              }
              if (res.status === 409) {
                setFormError('Аккаунт с этой почтой уже подтверждён. Войдите с паролем.');
                return;
              }
              if (res.status === 503) {
                setFormError('Регистрация на сервере требует DATABASE_URL. См. docs/AUTH_SETUP.md');
                return;
              }
              if (res.status === 502 && data?.needsVerification) {
                void router.replace({
                  pathname: '/auth/check-email',
                  query: { email: emailForCheck, callbackUrl, mailError: '1' },
                });
                return;
              }
              if (!res.ok) {
                setFormError(
                  res.status === 502
                    ? 'Аккаунт создан, но письмо не отправилось. На следующем шаге нажмите «Отправить письмо снова» или напишите на support@dynamicfont.ru.'
                    : 'Не удалось зарегистрироваться. Попробуйте ещё раз.',
                );
                return;
              }

              setPendingEmail(emailForCheck);
              setVerifyCode('');
              setPhase('verify');
            } finally {
              submittingRef.current = false;
              setSubmitting(false);
            }
          }}
        >
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className={AUTH_INPUT_CLASS}
            placeholder="ИМЯ"
          />
          <input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className={AUTH_INPUT_CLASS}
            placeholder="EMAIL"
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={AUTH_INPUT_CLASS}
            placeholder="ПАРОЛЬ"
          />
          <input
            id="passwordRepeat"
            type="password"
            value={passwordRepeat}
            onChange={(e) => setPasswordRepeat(e.target.value)}
            autoComplete="new-password"
            className={AUTH_INPUT_CLASS}
            placeholder="ПОВТОРИТЬ ПАРОЛЬ"
          />
          {deletedRecover ? (
            <div className="text-center">
              <p className={AUTH_FORM_ERROR_CLASS}>
                Аккаунт с этой почтой был удалён. Его можно восстановить
                {deletedRecover.recoverableUntil
                  ? ` до ${formatRecoveryDeadlineRu(deletedRecover.recoverableUntil)}`
                  : ' в течение 6 месяцев'}
                .
              </p>
              <p className={`mt-3 ${AUTH_FORM_SUCCESS_CLASS}`}>
                Введите тот же пароль и нажмите «Восстановить аккаунт».
              </p>
              <AuthSubmitButton loading={submitting} type="button" onClick={restoreDeletedAccount}>
                Восстановить аккаунт
              </AuthSubmitButton>
              <button
                type="button"
                className="mt-3 w-full text-center text-xs font-medium text-gray-600 underline underline-offset-2"
                onClick={() => setDeletedRecover(null)}
              >
                Зарегистрироваться как новый
              </button>
            </div>
          ) : (
            <>
              {formError ? <p className={AUTH_FORM_ERROR_CLASS}>{formError}</p> : null}
              <AuthSubmitButton loading={submitting}>Зарегистрироваться</AuthSubmitButton>
            </>
          )}
        </form>
        )}

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          Уже есть аккаунт?{' '}
          <Link
            href="/auth/signin"
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            Войти
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
