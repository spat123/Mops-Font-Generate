import React from 'react';
import { AppButton } from './AppButton';

/** Кнопка-«чип» с заливкой при выборе (наборы глифов в сайдбаре). Стили — {@link AppButton} `variant="chip"`. */
export function SelectableChip({ active, onClick, children, className = '', type = 'button', ...props }) {
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
