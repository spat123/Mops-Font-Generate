import React from 'react';
import Link from 'next/link';
import { AuthAnimatedLetters } from './AuthAnimatedLetters';

/** Поля формы: светло-серый фон, без OpenType-фич в наследовании от корня. */
export const AUTH_INPUT_CLASS =
  'h-12 w-full rounded-lg border-0 bg-[#f0f0f0] px-4 text-sm font-medium tracking-wide text-gray-900 placeholder:text-gray-500 placeholder:uppercase focus:outline-none focus:ring-2 focus:ring-black/10 [font-feature-settings:normal]';

export const AUTH_CODE_INPUT_CLASS =
  `${AUTH_INPUT_CLASS} text-center text-lg font-semibold tracking-[0.35em] placeholder:tracking-[0.35em] placeholder:normal-case`;

/** Сообщения форм auth — по центру, без цветной плашки. */
export const AUTH_FORM_ERROR_CLASS = 'text-center text-sm font-medium text-red-700';
export const AUTH_FORM_SUCCESS_CLASS = 'text-center text-sm font-medium text-green-800';
export const AUTH_FORM_WARNING_CLASS = 'text-center text-sm font-medium text-amber-900';

export const AUTH_PRIMARY_BTN_CLASS =
  'mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-4 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-90';

/** Кнопка отправки формы auth: при loading — спиннер по центру. */
export function AuthSubmitButton({ children, loading = false, disabled = false, type = 'submit', className = '' }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${AUTH_PRIMARY_BTN_CLASS} relative ${className}`.trim()}
    >
      <span className={loading ? 'invisible' : ''}>{children}</span>
      {loading ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </span>
      ) : null}
    </button>
  );
}

/** Внутренняя белая карточка слева: inset-тени и градиентная обводка (прозрачный верх → 10% чёрного снизу). */
export const AUTH_INNER_CARD_SURFACE = {
  border: '1px solid transparent',
  backgroundImage:
    'linear-gradient(white, white) padding-box, linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.1)) border-box',
  backgroundOrigin: 'padding-box, border-box',
  backgroundClip: 'padding-box, border-box',
  boxShadow:
    'inset 0 -7px 18.1px 0 rgba(0, 0, 0, 0.1), inset 0 -43px 68.7px 0 rgba(0, 0, 0, 0.05)',
};

/** Левая половина: серый фон, внутри — белая карточка с радиусом на всю доступную площадь. */
export function AuthTypographyPanel({ isRuGeo = false }) {
  return (
    <aside className="flex min-h-[40vh] flex-col bg-gray-50 p-3 sm:p-4 md:min-h-screen">
      <div
        className="flex min-h-0 flex-1 flex-col rounded-2xl p-8 sm:p-10"
        style={AUTH_INNER_CARD_SURFACE}
      >
        <AuthAnimatedLetters isRuGeo={isRuGeo} />
      </div>
    </aside>
  );
}

/** Полная версия логотипа (mark + wordmark в одном SVG). */
export function AuthLogoLink({ className = '' }) {
  return (
    <Link href="/" className={`mx-auto flex w-fit max-w-full items-center justify-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/Logo%20Dinamic.svg"
        alt="DINAMIC FONT"
        className="h-8 w-auto max-w-[min(100%,16rem)] select-none md:h-9"
        draggable={false}
      />
    </Link>
  );
}

export function AuthDividerOr() {
  return (
    <div className="flex items-center gap-3 py-1" role="separator">
      <span className="h-px flex-1 bg-gray-200" />
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400">или</span>
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

export function AuthLegalFooter() {
  return (
    <p className="text-center text-[11px] leading-relaxed text-gray-400">
      Создавая аккаунт, вы соглашаетесь с{' '}
      <Link
        href="/legal/terms"
        className="font-semibold text-gray-600 underline-offset-2 hover:text-accent hover:underline"
      >
        Условиями использования
      </Link>{' '}
      и{' '}
      <Link
        href="/legal/privacy"
        className="font-semibold text-gray-600 underline-offset-2 hover:text-accent hover:underline"
      >
        Политикой конфиденциальности
      </Link>
      .
    </p>
  );
}

/**
 * Двухколоночный макет auth: слева серый + белая вложенная панель, справа белый столбец;
 * юридический текст — внизу правого белого блока, внутри той же колонки что и форма.
 */
export function AuthSplitLayout({ children, footer, isRuGeo = false }) {
  return (
    <div className="min-h-screen [font-feature-settings:normal] md:grid md:min-h-screen md:grid-cols-2 md:items-stretch">
      <AuthTypographyPanel isRuGeo={Boolean(isRuGeo)} />
      <div className="flex min-h-screen flex-col bg-white md:min-h-screen">
        <div className="mx-auto flex min-h-0 w-full max-w-[24rem] flex-1 flex-col px-6 py-10 sm:px-8 md:py-12">
          <div className="flex flex-1 flex-col justify-center">
            <div className="w-full">{children}</div>
          </div>
          {footer ? <div className="mt-10 shrink-0 pb-2 pt-2 md:mt-auto md:pt-8">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
