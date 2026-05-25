import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getProviders, signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { SignInProviderButtons } from '../../components/auth/SignInProviderButtons';
import { getIsRuGeoFromHeaders } from '../../utils/authGeo';
import { hasSignedInBefore, markHasSignedInBefore } from '../../utils/authReturningUser';
import { redirectAfterAuth, redirectAfterAuthQuery } from '../../utils/authRedirect';
import { formatRecoveryDeadlineRu } from '../../lib/auth/accountDeletion';
import {
  AUTH_CODE_INPUT_CLASS,
  AUTH_FORM_ERROR_CLASS,
  AUTH_FORM_SUCCESS_CLASS,
  AUTH_FORM_WARNING_CLASS,
  AUTH_INPUT_CLASS,
  AuthDividerOr,
  AuthSubmitButton,
  AuthLegalFooter,
  AuthLogoLink,
  AuthSplitLayout,
} from '../../components/auth/AuthSplitLayout';

export async function getServerSideProps({ req }) {
  return { props: { isRuGeo: getIsRuGeoFromHeaders(req) } };
}

async function sessionSignIn(loginToken, callbackUrl) {
  return signIn('credentials', {
    redirect: false,
    loginToken,
    callbackUrl,
  });
}

export default function AuthSignInPage({ isRuGeo = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const callbackUrlRaw = typeof router.query?.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const callbackUrl = callbackUrlRaw.startsWith('/') ? callbackUrlRaw : '/';
  const oauthErrorCode = typeof router.query?.error === 'string' ? router.query.error : null;
  const verifiedStatus = typeof router.query?.verified === 'string' ? router.query.verified : null;
  const passwordResetDone = router.query?.reset === '1';
  const [login, setLogin] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loginCode, setLoginCode] = React.useState('');
  const [step, setStep] = React.useState('password');
  const [challengeId, setChallengeId] = React.useState('');
  const [stepUpEmail, setStepUpEmail] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [pendingVerifyEmail, setPendingVerifyEmail] = React.useState('');
  const [credentialsEnabled, setCredentialsEnabled] = React.useState(null);
  const [isReturningUser, setIsReturningUser] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [deletedRecover, setDeletedRecover] = React.useState(null);
  const submittingRef = React.useRef(false);
  const autoLoginRef = React.useRef(false);

  const restoreDeletedAccount = async () => {
    if (submittingRef.current) return;
    const trimmedLogin = String(login || '').trim();
    const trimmedPassword = String(password || '');
    if (!trimmedLogin || !trimmedPassword) {
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
        body: JSON.stringify({ email: trimmedLogin, password: trimmedPassword }),
      });
      if (!res.ok) {
        setFormError('Не удалось восстановить. Проверьте пароль или срок (6 месяцев).');
        return;
      }
      setDeletedRecover(null);
      const initRes = await fetch('/api/auth/login-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedLogin, password: trimmedPassword }),
      });
      const initData = await initRes.json().catch(() => ({}));
      if (initData?.loginToken) {
        await finishWithLoginToken(initData.loginToken);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setIsReturningUser(hasSignedInBefore());
  }, []);

  useEffect(() => {
    if (!oauthErrorCode) return;
    if (oauthErrorCode === 'Callback') {
      setFormError(
        'Не удалось завершить вход через Google/Яндекс. Обычно это сбой сохранения аккаунта на сервере. Попробуйте ещё раз; если не помогает — войдите по паролю.',
      );
      return;
    }
    if (oauthErrorCode === 'OAuthAccountNotLinked') {
      setFormError('Этот email уже привязан к другому способу входа. Войдите тем способом или привяжите аккаунт.');
      return;
    }
    setFormError('Ошибка входа. Попробуйте снова или используйте логин и пароль.');
  }, [oauthErrorCode]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (session?.user?.needsLink) {
      redirectAfterAuthQuery('/auth/link', { callbackUrl });
      return;
    }
    redirectAfterAuth(callbackUrl);
  }, [status, session?.user?.needsLink, callbackUrl]);

  useEffect(() => {
    let cancelled = false;
    getProviders()
      .then((p) => {
        if (cancelled || !p) return;
        setCredentialsEnabled(Boolean(p.credentials));
      })
      .catch(() => {
        if (!cancelled) setCredentialsEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const finishWithLoginToken = async (loginToken) => {
    const res = await sessionSignIn(loginToken, callbackUrl);
    if (res?.error) {
      setFormError('Не удалось завершить вход. Попробуйте снова.');
      return false;
    }
    markHasSignedInBefore();
    const nextUrl = typeof res?.url === 'string' ? res.url : callbackUrl;
    redirectAfterAuth(nextUrl);
    return true;
  };

  useEffect(() => {
    if (!router.isReady || status === 'loading' || status === 'authenticated') return;
    const loginToken =
      typeof router.query?.loginToken === 'string' ? router.query.loginToken.trim() : '';
    if (!loginToken || autoLoginRef.current) return;
    autoLoginRef.current = true;
    void finishWithLoginToken(loginToken);
  }, [router.isReady, router.query.loginToken, status]);

  return (
    <>
      <Head>
        <title>{isReturningUser ? 'С возвращением — DINAMIC FONT' : 'Вход — DINAMIC FONT'}</title>
      </Head>
      <AuthSplitLayout isRuGeo={isRuGeo} footer={<AuthLegalFooter />}>
        <AuthLogoLink className="mb-10" />

        <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">Вход</h1>
        <p className="mt-2 text-center text-sm font-normal text-gray-500">
          {step === 'code'
            ? 'Новое устройство — введите код из письма'
            : isReturningUser
              ? 'С возвращением!'
              : 'Добро пожаловать!'}
        </p>

        {verifiedStatus === '1' && !router.query?.loginToken ? (
          <p className={`mt-6 ${AUTH_FORM_SUCCESS_CLASS}`}>Регистрация и подтверждение завершены. Теперь можно войти.</p>
        ) : null}
        {passwordResetDone ? (
          <p className={`mt-6 ${AUTH_FORM_SUCCESS_CLASS}`}>Пароль обновлён. Войдите с новым паролем.</p>
        ) : null}
        {verifiedStatus === 'expired' ? (
          <p className={`mt-6 ${AUTH_FORM_WARNING_CLASS}`}>
            Код или ссылка устарели. Запросите новое письмо на странице после регистрации.
          </p>
        ) : null}
        {verifiedStatus && verifiedStatus !== '1' && verifiedStatus !== 'expired' && verifiedStatus !== 'missing' ? (
          <p className={`mt-6 ${AUTH_FORM_ERROR_CLASS}`}>Код или ссылка подтверждения недействительны.</p>
        ) : null}
        {formError && oauthErrorCode ? <p className={`mt-6 ${AUTH_FORM_ERROR_CLASS}`}>{formError}</p> : null}

        <div className="mt-8 flex flex-col gap-2">
          <SignInProviderButtons callbackUrl={callbackUrl} appearance="auth" />
        </div>

        <div className="mt-6">
          <AuthDividerOr />
        </div>

        {deletedRecover && step === 'password' ? (
          <div className="mt-6 text-center">
            <p className={AUTH_FORM_ERROR_CLASS}>
              Аккаунт был удалён. Восстановить можно
              {deletedRecover.recoverableUntil
                ? ` до ${formatRecoveryDeadlineRu(deletedRecover.recoverableUntil)}`
                : ' в течение 6 месяцев'}
              .
            </p>
            <p className={`mt-3 ${AUTH_FORM_SUCCESS_CLASS}`}>Используйте тот же пароль.</p>
            <AuthSubmitButton loading={submitting} type="button" onClick={restoreDeletedAccount}>
              Восстановить аккаунт
            </AuthSubmitButton>
            <button
              type="button"
              className="mt-3 w-full text-center text-xs font-medium text-gray-600 underline underline-offset-2"
              onClick={() => setDeletedRecover(null)}
            >
              Назад ко входу
            </button>
          </div>
        ) : null}

        {step === 'password' && !deletedRecover ? (
          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (submittingRef.current) return;
              submittingRef.current = true;
              setSubmitting(true);
              setFormError('');
              setPendingVerifyEmail('');
              setDeletedRecover(null);
              try {
                if (credentialsEnabled === false) {
                  setFormError('Вход по логину/паролю пока не настроен.');
                  return;
                }
                const trimmedLogin = String(login || '').trim();
                const trimmedPassword = String(password || '');
                if (!trimmedLogin || !trimmedPassword) {
                  setFormError('Введите логин и пароль.');
                  return;
                }

                const initRes = await fetch('/api/auth/login-init', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'same-origin',
                  body: JSON.stringify({ email: trimmedLogin, password: trimmedPassword }),
                });
                const initData = await initRes.json().catch(() => ({}));

                if (initRes.status === 403 && initData?.needsVerification) {
                  setPendingVerifyEmail(trimmedLogin);
                  setFormError('Подтвердите email: введите код из письма на странице проверки почты.');
                  return;
                }
                if (initRes.status === 403 && initData?.code === 'DELETED_RECOVERABLE') {
                  setDeletedRecover({
                    email: initData.email || trimmedLogin,
                    recoverableUntil: initData.recoverableUntil || null,
                  });
                  return;
                }
                if (initRes.status === 401) {
                  setFormError('Неверный логин или пароль.');
                  return;
                }
                if (initRes.status === 502 && initData?.code === 'EMAIL_FAILED') {
                  setFormError('Не удалось отправить код на почту. Попробуйте позже.');
                  return;
                }
                if (!initRes.ok) {
                  setFormError('Не удалось выполнить вход. Попробуйте позже.');
                  return;
                }

                if (initData?.needsCode && initData?.challengeId) {
                  setStep('code');
                  setChallengeId(initData.challengeId);
                  setStepUpEmail(initData.email || trimmedLogin);
                  setLoginCode('');
                  return;
                }

                if (initData?.loginToken) {
                  await finishWithLoginToken(initData.loginToken);
                  return;
                }

                setFormError('Не удалось выполнить вход. Попробуйте позже.');
              } finally {
                submittingRef.current = false;
                setSubmitting(false);
              }
            }}
          >
            <input
              id="login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              className={AUTH_INPUT_CLASS}
              placeholder="ЛОГИН ИЛИ EMAIL"
            />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={AUTH_INPUT_CLASS}
              placeholder="ПАРОЛЬ"
            />
            {formError && !oauthErrorCode ? (
              <div className={AUTH_FORM_ERROR_CLASS}>
                <p>{formError}</p>
                {pendingVerifyEmail ? (
                  <Link
                    href={`/auth/check-email?email=${encodeURIComponent(pendingVerifyEmail)}`}
                    className="mt-2 inline-block text-accent underline underline-offset-2"
                  >
                    Ввести код подтверждения
                  </Link>
                ) : null}
              </div>
            ) : null}
            <AuthSubmitButton loading={submitting}>Вход</AuthSubmitButton>
            {credentialsEnabled !== false ? (
              <p className="mt-3 text-center">
                <Link
                  href={{
                    pathname: '/auth/forgot-password',
                    query: { callbackUrl, email: String(login || '').trim() || undefined },
                  }}
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-600 underline underline-offset-2 hover:text-gray-900"
                >
                  Забыли пароль?
                </Link>
              </p>
            ) : null}
          </form>
        ) : step === 'code' ? (
          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (submittingRef.current) return;
              submittingRef.current = true;
              setSubmitting(true);
              setFormError('');
              try {
                const digits = String(loginCode || '').replace(/\D/g, '');
                if (digits.length !== 6) {
                  setFormError('Введите 6 цифр из письма.');
                  return;
                }
                let verifyRes;
                try {
                  verifyRes = await fetch('/api/auth/login-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                      challengeId,
                      code: digits,
                    }),
                  });
                } catch {
                  setFormError(
                    'Не удалось связаться с сервером (сбой сети). Подождите и отправьте код снова — не запрашивайте новый, если письмо свежее.',
                  );
                  return;
                }
                const verifyData = await verifyRes.json().catch(() => ({}));
                if (verifyRes.status === 400 && verifyData?.code === 'TOKEN_EXPIRED') {
                  setFormError('Код устарел. Вернитесь и войдите снова, чтобы получить новый.');
                  return;
                }
                if (verifyRes.status === 429) {
                  setFormError('Слишком много попыток. Запросите новый код, войдя снова.');
                  return;
                }
                if (verifyRes.status === 400 && verifyData?.code === 'INVALID_CODE') {
                  setFormError(
                    'Неверный код. Нужен код из письма «Код для входа», не из регистрации. Все 6 цифр, ведущие нули тоже. Или нажмите «Назад к паролю» и войдите снова — придёт новый код.',
                  );
                  return;
                }
                if (!verifyRes.ok) {
                  setFormError(
                    verifyRes.status >= 500
                      ? 'Сервер временно недоступен. Подождите минуту и повторите тот же код.'
                      : 'Не удалось проверить код. Попробуйте снова.',
                  );
                  return;
                }
                if (!verifyData?.loginToken) {
                  setFormError('Не удалось завершить вход. Войдите снова и запросите новый код.');
                  return;
                }
                await finishWithLoginToken(verifyData.loginToken);
              } finally {
                submittingRef.current = false;
                setSubmitting(false);
              }
            }}
          >
            {stepUpEmail ? (
              <p className="text-center text-xs text-gray-600">
                На <span className="font-semibold text-gray-900">{stepUpEmail}</span> пришло письмо{' '}
                <span className="font-semibold">«Код для входа»</span> — код действует 15 минут (не письмо «Подтвердите email»).
                {' '}
                Если писем несколько — берите код только из <span className="font-semibold">последнего</span> такого
                письма.
              </p>
            ) : null}
            <label
              htmlFor="login-code"
              className="text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500"
            >
              Код для входа
            </label>
            <input
              id="login-code"
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className={AUTH_CODE_INPUT_CLASS}
              disabled={submitting}
            />
            {formError ? <p className={AUTH_FORM_ERROR_CLASS}>{formError}</p> : null}
            <AuthSubmitButton loading={submitting}>Подтвердить вход</AuthSubmitButton>
            <button
              type="button"
              className="text-center text-xs font-medium text-gray-600 underline underline-offset-2 hover:text-gray-900"
              disabled={submitting}
              onClick={() => {
                setStep('password');
                setChallengeId('');
                setLoginCode('');
                setFormError('');
              }}
            >
              Назад к паролю
            </button>
          </form>
        ) : null}

        <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-900">
          Нет аккаунта?{' '}
          <Link
            href="/auth/signup"
            className="text-accent underline decoration-accent underline-offset-[3px] hover:text-accent-hover"
          >
            Зарегистрироваться
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
