import React from 'react';

/** Режимы превью в шапке страницы (соответствуют SettingsContext / FontPreview). */
export const VIEW_MODE_OPTIONS = [
  { value: 'plain', label: 'Plain' },
  { value: 'waterfall', label: 'Waterfall' },
  { value: 'glyphs', label: 'Glyphs' },
  { value: 'styles', label: 'Styles' },
];

/**
 * Сегментированный переключатель.
 * @param {'compact'|'joined'|'surface'} variant — compact: шапка; joined: прежний полный ряд; surface: как «Текст / Фон» в сайдбаре (серый фон, py-2, text-xs).
 */
export function SegmentedControl({
  value,
  onChange,
  options,
  variant = 'compact',
  label,
  className = '',
}) {
  if (variant === 'surface') {
    return (
      <div className={`flex min-w-0 overflow-hidden rounded-md bg-gray-50 ${className}`.trim()}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
              value === opt.value
                ? 'bg-accent text-white'
                : 'bg-transparent text-gray-700'
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'joined') {
    const n = options.length;
    return (
      <div className={`flex ${className}`.trim()}>
        {options.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            className={`flex-1 py-1.5 text-sm font-medium text-center transition-colors ${
              i === 0 ? 'rounded-l-md' : ''
            } ${i === n - 1 ? 'rounded-r-md' : ''} ${
              value === opt.value
                ? 'bg-accent text-white'
                : 'bg-white text-accent bg-opacity-60 hover:bg-opacity-80'
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`.trim()}>
      <div className="flex h-8 overflow-hidden rounded-md border border-gray-200 bg-white">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`px-3 text-xs transition-colors ${
              value === opt.value
                ? 'bg-accent text-white'
                : 'text-accent hover:bg-accent-soft'
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
