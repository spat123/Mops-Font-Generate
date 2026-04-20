import React from 'react';

function IconViewPlain(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M4 6h16" />
      <path d="M4 10h12" />
      <path d="M4 14h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

function IconViewWaterfall(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M7 20V10" />
      <path d="M12 20V4" />
      <path d="M17 20v-6" />
    </svg>
  );
}

function IconViewGlyphs(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <rect x="10" y="10" width="4" height="4" rx="0.5" />
    </svg>
  );
}

function IconViewStyles(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M4 7h4" />
      <path d="M4 12h8" />
      <path d="M4 17h6" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="18" cy="12" r="2" />
      <circle cx="15" cy="17" r="2" />
    </svg>
  );
}

/** Режимы превью в шапке страницы (соответствуют SettingsContext / FontPreview). */
export const VIEW_MODE_OPTIONS = [
  {
    value: 'plain',
    label: 'Plain',
    title: 'Plain — редактируемый текст',
    Icon: IconViewPlain,
  },
  {
    value: 'waterfall',
    label: 'Waterfall',
    title: 'Waterfall — каскад размеров',
    Icon: IconViewWaterfall,
  },
  {
    value: 'glyphs',
    label: 'Glyphs',
    title: 'Glyphs — таблица глифов',
    Icon: IconViewGlyphs,
  },
  {
    value: 'styles',
    label: 'Styles',
    title: 'Styles — начертания и оси',
    Icon: IconViewStyles,
  },
];

/** Серая «рельса» сайдбара: группа иконок 32×32 */
export const ICON_RAIL_TRACK_CLASS =
  'flex min-h-8 shrink-0 overflow-hidden rounded-md bg-gray-50';

/**
 * Классы одной кнопки в {@link ICON_RAIL_TRACK_CLASS}.
 * @param {boolean} active
 * @param {{ hasIcon?: boolean }} [opts] — для подписей без иконки (Аа/АА) передать hasIcon: false
 */
export function iconRailSegmentClass(active, opts = {}) {
  const hasIcon = opts.hasIcon !== false;
  return [
    'flex h-8 w-8 shrink-0 items-center justify-center p-0 transition-colors',
    hasIcon ? 'text-xs' : '',
    active ? 'text-accent rounded-md' : 'text-gray-700 hover:bg-black/[0.06]',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Сегментированный переключатель.
 * @param {'compact'|'joined'|'surface'|'grid'|'pairOutline'|'iconRail'} variant — compact / joined / surface / grid / pairOutline / iconRail (сайдбар: 32×32 в серой рельсе).
 */
export function SegmentedControl({
  value,
  onChange,
  options,
  variant = 'compact',
  label,
  className = '',
}) {
  if (variant === 'iconRail') {
    return (
      <div
        className={`${ICON_RAIL_TRACK_CLASS} ${className}`.trim()}
        role={label ? 'group' : undefined}
        aria-label={label}
      >
        {options.map((opt) => {
          const Icon = opt.Icon;
          const active = value === opt.value;
          const tip = opt.title ?? opt.label ?? '';
          const hasIcon = Boolean(Icon);
          return (
            <button
              key={opt.value}
              type="button"
              title={tip}
              aria-label={opt['aria-label'] ?? tip}
              aria-pressed={active}
              className={`${iconRailSegmentClass(active, { hasIcon })} ${opt.className ?? ''}`.trim()}
              onClick={() => onChange(opt.value)}
            >
              {Icon ? (
                <Icon className="h-4 w-4 shrink-0" />
              ) : (
                <span className={opt.labelClassName ?? ''}>{opt.label}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'grid') {
    const n = options.length;
    return (
      <div
        className={`grid w-full h-full min-w-0 gap-px overflow-hidden border-b border-gray-200 bg-gray-200 ${className}`.trim()}
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => {
          const Icon = opt.Icon;
          const tip = opt.title ?? opt.label;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              title={tip}
              aria-label={tip}
              aria-pressed={active}
              className={`relative flex min-h-8 min-w-0 items-center justify-center px-1 py-2 text-center text-xs font-medium transition-colors ${
                active
                  ? 'z-[1] bg-accent text-white'
                  : 'bg-white text-gray-600 hover:text-accent'
              }`}
              onClick={() => onChange(opt.value)}
            >
              {Icon ? (
                <Icon className="h-4 w-4 shrink-0" />
              ) : (
                <span>{opt.label}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pairOutline') {
    return (
      <div className={`flex min-w-0 flex-wrap items-center gap-2 ${className}`.trim()} role="group">
        {options.map((opt) => {
          const Icon = opt.Icon;
          const active = value === opt.value;
          const tip = opt.title ?? opt.label;
          return (
            <button
              key={opt.value}
              type="button"
              title={tip}
              aria-label={tip}
              aria-pressed={active}
              className={`flex min-h-10 w-32 shrink-0 items-center justify-center rounded-md border px-3 py-1.5 text-center text-xs uppercase font-semibold transition-colors ${
                active
                  ? 'border-accent bg-accent text-white'
                  : 'border-gray-200 bg-white text-gray-900 hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9]'
              }`}
              onClick={() => onChange(opt.value)}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'surface') {
    return (
      <div className={`flex min-w-0 overflow-hidden rounded-full bg-gray-50 ${className}`.trim()}>
        {options.map((opt) => {
          const Icon = opt.Icon;
          const tip = opt.title ?? opt.label;
          return (
            <button
              key={opt.value}
              type="button"
              title={tip}
              aria-label={tip}
              className={`flex min-h-8 min-w-0 flex-1 items-center justify-center px-1 py-2 text-center text-xs uppercase font-semibold transition-colors ${
                value === opt.value
                  ? 'bg-accent text-white rounded-full'
                  : 'bg-transparent text-gray-700 hover:bg-black/[0.04]'
              }`}
              onClick={() => onChange(opt.value)}
            >
              {Icon ? (
                <Icon className="h-4 w-4 shrink-0" />
              ) : (
                <span>{opt.label}</span>
              )}
            </button>
          );
        })}
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
