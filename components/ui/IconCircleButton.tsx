import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

const VARIANT_CLASSES = {
  toolbar: {
    idle: 'bg-gray-50 text-gray-800 hover:text-white hover:bg-accent',
    pressed: 'bg-accent text-white hover:bg-accent-hover hover:text-white',
  },
  gray100Menu: {
    idle: 'bg-white text-gray-800 hover:text-accent',
    pressed: 'bg-accent text-white hover:bg-accent hover:text-white [&_svg]:text-white',
  },
  gray50Menu: {
    idle: 'bg-gray-50 text-gray-800  hover:text-accent',
    pressed: 'bg-accent text-white hover:bg-accent hover:text-white [&_svg]:text-white',
  },
  gray100Close: {
    idle: 'bg-gray-100 text-gray-800 hover:bg-accent hover:text-white',
    pressed: 'bg-gray-100 text-gray-800 hover:bg-accent hover:text-white',
  },
  searchToggle: {
    idle: 'bg-gray-100 text-gray-800 hover:bg-accent hover:text-white',
    pressed: 'bg-accent text-white hover:bg-accent-hover',
  },
  accent: {
    idle: 'bg-accent text-white hover:bg-accent-hover',
    pressed: 'bg-accent text-white hover:bg-accent-hover',
  },
} as const;

const BASE_CLASS =
  'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed';

export type IconCircleButtonVariant = keyof typeof VARIANT_CLASSES;

export type IconCircleButtonSize = keyof typeof SIZE_CLASSES;

export type IconCircleButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: IconCircleButtonVariant;
  size?: IconCircleButtonSize | (string & {});
  pressed?: boolean;
  as?: ElementType;
  children?: ReactNode;
};

function stateClass(variant: IconCircleButtonVariant, pressed: boolean) {
  const row = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.toolbar;
  return pressed ? row.pressed : row.idle;
}

export function IconCircleButton({
  variant = 'toolbar',
  size = 'sm',
  pressed = false,
  as,
  className = '',
  children,
  type,
  ...rest
}: IconCircleButtonProps) {
  const Comp = as || 'button';
  const isNativeButton = Comp === 'button';
  const sizeKey = size as keyof typeof SIZE_CLASSES;
  const sizeClass = SIZE_CLASSES[sizeKey] ?? SIZE_CLASSES.sm;
  const merged = `${BASE_CLASS} ${sizeClass} ${stateClass(variant, pressed)} ${className}`.trim();

  return (
    <Comp {...rest} className={merged} {...(isNativeButton ? { type: type ?? 'button' } : {})}>
      {children}
    </Comp>
  );
}
