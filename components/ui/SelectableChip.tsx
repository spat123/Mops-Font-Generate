import type { ReactNode } from 'react';
import { AppButton, type AppButtonProps } from './AppButton';

export type SelectableChipProps = Omit<AppButtonProps, 'variant' | 'pressed' | 'size'> & {
  active?: boolean;
  onClick?: AppButtonProps['onClick'];
  children?: ReactNode;
};

/** Кнопка-«чип» с заливкой при выборе (наборы глифов в сайдбаре). Стили — {@link AppButton} `variant="chip"`. */
export function SelectableChip({
  active,
  onClick,
  children,
  className = '',
  type = 'button',
  ...props
}: SelectableChipProps) {
  return (
    <AppButton
      type={type}
      variant="chip"
      pressed={Boolean(active)}
      size="xs"
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </AppButton>
  );
}
