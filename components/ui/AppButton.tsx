import { forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react';

/**
 * Кнопки приложения без box-shadow на базовых вариантах.
 *
 * Варианты:
 * - `outline` — белая с рамкой, hover: чёрная заливка + белый текст.
 * - `accent` — заливка accent (основное действие).
 * - `toolbarIcon` — как круглые `IconCircleButton` variant `toolbar`, но `rounded-md` (нижняя полоса сайдбара).
 * - `soft` — серый фон, hover: лёгкий accent; `pressed` — активное красное.
 * - `chip` — белая с рамкой; `pressed` — выбранное состояние accent.
 * - `link` — текстовая, без рамки; hover: accent + подчёркивание.
 *
 * Составная кнопка «действие + меню» — см. {@link AppButtonSplit}.
 */
const VARIANT_BASE = {
  outline: [
    'rounded-md border border-gray-200 bg-white',
    'font-semibold uppercase tracking-tight text-gray-900',
    'transition-colors',
    'hover:border-black/[0.9] hover:bg-black/[0.9] hover:text-white',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-900',
  ].join(' '),
  accent: [
    'rounded-md border border-accent bg-accent',
    'font-semibold uppercase tracking-tight text-white',
    'transition-colors hover:bg-accent-hover',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  softOff: [
    'rounded-md border border-transparent bg-gray-50',
    'text-gray-600 transition-colors',
    'hover:bg-accent/10 hover:text-accent',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  softOn: [
    'rounded-md border border-accent bg-accent text-white',
    'transition-colors hover:bg-accent-hover',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  toolbarIconOff: [
    'rounded-md border-0 bg-gray-50',
    'text-gray-800 transition-colors leading-none',
    'hover:bg-accent hover:text-white',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
    'disabled:cursor-not-allowed disabled:opacity-50',
    '[&_svg]:block',
  ].join(' '),
  toolbarIconOn: [
    'rounded-md border-0 bg-accent text-white',
    'transition-colors leading-none hover:bg-accent-hover hover:text-white',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
    'disabled:cursor-not-allowed disabled:opacity-50',
    '[&_svg]:block',
  ].join(' '),
  chipOff: [
    'rounded-md border border-gray-200 bg-white',
    'text-center font-semibold uppercase text-gray-800',
    'transition-colors duration-150',
    'hover:border-black/[0.9] hover:bg-black/[0.9] hover:text-white',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-800',
  ].join(' '),
  chipOn: [
    'rounded-md border border-accent bg-accent text-white',
    'text-center font-semibold uppercase',
    'transition-colors duration-150 hover:bg-accent-hover',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent disabled:hover:text-white',
  ].join(' '),
  link: [
    'rounded-md border border-transparent bg-transparent',
    'text-[11px] font-medium uppercase tracking-tight underline-offset-2',
    'text-gray-400 transition-colors',
    'hover:text-accent hover:underline',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
} as const;

const SIZE_CLASS = {
  xs: 'min-h-8 px-3 py-1.5 text-xs',
  sm: 'min-h-8 px-3 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-5 py-3 text-base',
  rail: 'box-border h-9 max-h-9 min-h-9 w-full shrink-0 !gap-0 px-2 py-0 text-sm leading-none [&_svg]:block',
  icon: 'h-9 w-9 min-h-9 min-w-9 shrink-0 !gap-0 p-0 [&_svg]:block',
} as const;

const BASE_CLASS = 'inline-flex cursor-pointer items-center justify-center gap-2';

export type AppButtonVariant = 'outline' | 'accent' | 'soft' | 'toolbarIcon' | 'chip' | 'link';

export type AppButtonSize = keyof typeof SIZE_CLASS | (string & {});

export type AppButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: AppButtonVariant;
  /** Для `soft`, `chip`, `toolbarIcon`: активное (красное) состояние */
  pressed?: boolean;
  size?: AppButtonSize;
  fullWidth?: boolean;
  as?: ElementType;
  children?: ReactNode;
};

function resolveVariantClass(variant: AppButtonVariant, pressed: boolean) {
  if (variant === 'soft') {
    return pressed ? VARIANT_BASE.softOn : VARIANT_BASE.softOff;
  }
  if (variant === 'toolbarIcon') {
    return pressed ? VARIANT_BASE.toolbarIconOn : VARIANT_BASE.toolbarIconOff;
  }
  if (variant === 'chip') {
    return pressed ? VARIANT_BASE.chipOn : VARIANT_BASE.chipOff;
  }
  if (variant === 'link') {
    return VARIANT_BASE.link;
  }
  if (variant === 'accent') {
    return VARIANT_BASE.accent;
  }
  return VARIANT_BASE.outline;
}

export const AppButton = forwardRef<HTMLElement, AppButtonProps>(function AppButton(
  {
    variant = 'outline',
    pressed = false,
    size = 'md',
    fullWidth = false,
    className = '',
    type = 'button',
    as: Comp = 'button',
    ...rest
  },
  ref,
) {
  const v = resolveVariantClass(variant, pressed);
  const isLink = variant === 'link';
  const sizeKey = size as keyof typeof SIZE_CLASS;
  const s = isLink ? 'min-h-0 px-1 py-1 leading-tight' : SIZE_CLASS[sizeKey] ?? SIZE_CLASS.md;
  const w = fullWidth ? 'w-full' : '';
  const merged = `${BASE_CLASS} ${v} ${s} ${w} ${className}`.trim().replace(/\s+/g, ' ');

  return (
    <Comp
      ref={ref}
      className={merged}
      {...(Comp === 'button' ? { type } : {})}
      {...rest}
    />
  );
});

AppButton.displayName = 'AppButton';

export { AppButtonSplit } from './AppButtonSplit';
