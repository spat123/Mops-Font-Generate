import React from 'react';

export function CatalogCheckboxMark({
  checked = false,
  inverted = false,
  className = '',
}) {
  return (
    <span
      aria-hidden
      className={[
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors',
        inverted
          ? checked
            ? 'border-white bg-white text-gray-900'
            : 'border-white/70 bg-transparent text-transparent'
          : checked
            ? 'border-accent bg-accent text-white'
            : 'border-gray-400 bg-white text-transparent',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        className="h-3 w-3"
      >
        <path
          d="M3.5 8.5L6.5 11.5L12.5 4.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function CatalogCheckboxControl({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
}) {
  return (
    <label
      className={[
        'flex h-10 shrink-0 items-center gap-2 rounded-md border border-transparent bg-gray-50 px-2 text-sm font-semibold uppercase text-gray-900 sm:px-3',
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked, event)}
        className={['sr-only', inputClassName].filter(Boolean).join(' ')}
      />
      <CatalogCheckboxMark checked={checked} />
      <span className={['min-w-0 whitespace-nowrap', labelClassName].filter(Boolean).join(' ')}>
        {label}
      </span>
    </label>
  );
}
