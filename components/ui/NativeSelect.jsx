import React, { forwardRef } from 'react';

/**
 * Нативный select без системной стрелки: своя иконка справа по центру по высоте.
 * Без внешних UI-библиотек.
 */
export const NativeSelect = forwardRef(function NativeSelect(
  { className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <div className="group relative min-w-0 w-full">
      <select
        ref={ref}
        disabled={disabled}
        {...rest}
        className={[
          /* фон задаётся только через className — иначе bg-transparent/bg-white бьётся с bg-gray-50 в порядке утилит Tailwind */
          'peer native-select-field appearance-none [&::-ms-expand]:hidden',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </select>
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-center text-gray-900 transition-colors group-hover:text-white peer-disabled:text-gray-600 peer-disabled:group-hover:text-gray-600"
        aria-hidden
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </div>
  );
});
