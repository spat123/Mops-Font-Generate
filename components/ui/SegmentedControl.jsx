import React from 'react';
import { Tooltip } from './Tooltip';

const ICON_VIEW_PLAIN_D = [
  "M9.60049 20.4485C11.0227 19.2932 12.9781 19.2933 14.4003 20.4485L16.247 21.9485C16.6547 22.2798 16.7371 22.9061 16.4315 23.3479C16.1257 23.7",
  "897 15.5474 23.8793 15.1396 23.5481L13.2929 22.0481C12.5271 21.4263 11.4736 21.4262 10.7079 22.0481C9.28567 23.2035 7.33036 23.2035 5.90811 ",
  "22.0481C5.1424 21.4262 4.08889 21.4263 3.32315 22.0481L1.47647 23.5481C1.06861 23.8793 0.490341 23.7897 0.184478 23.3479C-0.120998 22.9062 -",
  "0.0385758 22.2798 0.369049 21.9485L2.21573 20.4485C3.63795 19.2932 5.59334 19.2932 7.01553 20.4485C7.78138 21.0707 8.83464 21.0707 9.60049 2",
  "0.4485ZM16.9862 13.7825C18.4083 12.6275 20.363 12.6275 21.7851 13.7825L23.6317 15.2825C24.0395 15.6138 24.122 16.2401 23.8163 16.6819C23.510",
  "5 17.1237 22.9322 17.2133 22.5243 16.8821L20.6786 15.3821C19.9128 14.7599 18.8585 14.7599 18.0927 15.3821C16.6704 16.5375 14.7151 16.5375 13",
  ".2929 15.3821C12.5271 14.7603 11.4736 14.7602 10.7079 15.3821C9.28567 16.5375 7.33036 16.5375 5.90811 15.3821C5.1424 14.7602 4.08889 14.7603",
  " 3.32315 15.3821L1.47647 16.8821C1.06861 17.2133 0.490341 17.1237 0.184478 16.6819C-0.120998 16.2401 -0.0385759 15.6138 0.369049 15.2825L2.2",
  "1573 13.7825C3.63795 12.6272 5.59334 12.6272 7.01553 13.7825C7.78138 14.4047 8.83464 14.4047 9.60049 13.7825C11.0227 12.6271 12.9781 12.6273",
  " 14.4003 13.7825C15.1662 14.4047 16.2204 14.4047 16.9862 13.7825ZM1.29288 7.86647C3.26216 6.26663 5.9691 6.26663 7.93838 7.86647L8.86124 8.6",
  "1647C9.26905 8.94781 9.35255 9.57407 9.04678 10.0159C8.74099 10.4575 8.16262 10.547 7.75479 10.2161L6.83096 9.46608C5.51807 8.39952 3.71218 ",
  "8.39945 2.39932 9.46608L1.47647 10.2161C1.06866 10.5471 0.490313 10.4575 0.184478 10.0159C-0.121187 9.57422 -0.0384015 8.9479 0.369049 8.616",
  "47L1.29288 7.86647ZM16.9862 0.866474C18.4083 -0.288506 20.363 -0.288507 21.7851 0.866474L23.6317 2.36647C24.0395 2.69777 24.122 3.32408 23.8",
  "163 3.76589C23.5105 4.20766 22.9322 4.29732 22.5243 3.96608L20.6786 2.46608C19.9128 1.84389 18.8585 1.8439 18.0927 2.46608C16.6704 3.62148 1",
  "4.7151 3.62148 13.2929 2.46608C12.5271 1.84428 11.4736 1.84415 10.7079 2.46608C9.28567 3.62148 7.33036 3.62148 5.90811 2.46608C5.1424 1.8441",
  "8 4.08889 1.84424 3.32315 2.46608L1.47647 3.96608C1.06861 4.29732 0.490341 4.20766 0.184478 3.76589C-0.120998 3.32413 -0.0385759 2.69775 0.3",
  "69049 2.36647L2.21573 0.866474C3.63795 -0.288796 5.59334 -0.288853 7.01553 0.866474C7.78138 1.48869 8.83464 1.48867 9.60049 0.866474C11.0227",
  " -0.288868 12.9781 -0.288752 14.4003 0.866474C15.1662 1.4887 16.2204 1.4887 16.9862 0.866474Z",
].join('');

function IconViewPlain(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d={ICON_VIEW_PLAIN_D} />
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
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M0 3.2C0 2.07989 0 1.51984 0.217987 1.09202C0.409734 0.715695 0.715695 0.409734 1.09202 0.217987C1.51984 0 2.0799 0 3.2 0H20.8C21.9201 0 22.4802 0 22.908 0.217987C23.2843 0.409734 23.5903 0.715695 23.782 1.09202C24 1.51984 24 2.0799 24 3.2V4.8C24 5.92011 24 6.48016 23.782 6.90798C23.5903 7.28431 23.2843 7.59027 22.908 7.78201C22.4802 8 21.9201 8 20.8 8H3.2C2.0799 8 1.51984 8 1.09202 7.78201C0.715695 7.59027 0.409734 7.28431 0.217987 6.90798C0 6.48016 0 5.92011 0 4.8V3.2Z" />
      <path d="M0 15C0 14.0681 0 13.6022 0.152241 13.2346C0.355229 12.7446 0.744577 12.3552 1.23463 12.1522C1.60218 12 2.06812 12 3 12H21C21.9319 12 22.3978 12 22.7654 12.1522C23.2554 12.3552 23.6448 12.7446 23.8478 13.2346C24 13.6022 24 14.0681 24 15C24 15.9319 24 16.3978 23.8478 16.7654C23.6448 17.2554 23.2554 17.6448 22.7654 17.8478C22.3978 18 21.9319 18 21 18H3C2.06812 18 1.60218 18 1.23463 17.8478C0.744577 17.6448 0.355229 17.2554 0.152241 16.7654C0 16.3978 0 15.9319 0 15Z" />
      <path d="M0 23C0 22.4477 0.447715 22 1 22H23C23.5523 22 24 22.4477 24 23C24 23.5523 23.5523 24 23 24H1C0.447716 24 0 23.5523 0 23Z" />
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
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M0 4.8C0 3.11984 0 2.27976 0.32698 1.63803C0.614601 1.07354 1.07354 0.614601 1.63803 0.32698C2.27976 0 3.11984 0 4.8 0H5.2C6.88016 0 7.72024 0 8.36197 0.32698C8.92646 0.614601 9.3854 1.07354 9.67302 1.63803C10 2.27976 10 3.11984 10 4.8V5.2C10 6.88016 10 7.72024 9.67302 8.36197C9.3854 8.92646 8.92646 9.3854 8.36197 9.67302C7.72024 10 6.88016 10 5.2 10H4.8C3.11984 10 2.27976 10 1.63803 9.67302C1.07354 9.3854 0.614601 8.92646 0.32698 8.36197C0 7.72024 0 6.88016 0 5.2V4.8Z" />
      <path d="M0 18.8C0 17.1198 0 16.2798 0.32698 15.638C0.614601 15.0735 1.07354 14.6146 1.63803 14.327C2.27976 14 3.11984 14 4.8 14H5.2C6.88016 14 7.72024 14 8.36197 14.327C8.92646 14.6146 9.3854 15.0735 9.67302 15.638C10 16.2798 10 17.1198 10 18.8V19.2C10 20.8802 10 21.7202 9.67302 22.362C9.3854 22.9265 8.92646 23.3854 8.36197 23.673C7.72024 24 6.88016 24 5.2 24H4.8C3.11984 24 2.27976 24 1.63803 23.673C1.07354 23.3854 0.614601 22.9265 0.32698 22.362C0 21.7202 0 20.8802 0 19.2V18.8Z" />
      <path d="M14 4.8C14 3.11984 14 2.27976 14.327 1.63803C14.6146 1.07354 15.0735 0.614601 15.638 0.32698C16.2798 0 17.1198 0 18.8 0H19.2C20.8802 0 21.7202 0 22.362 0.32698C22.9265 0.614601 23.3854 1.07354 23.673 1.63803C24 2.27976 24 3.11984 24 4.8V5.2C24 6.88016 24 7.72024 23.673 8.36197C23.3854 8.92646 22.9265 9.3854 22.362 9.67302C21.7202 10 20.8802 10 19.2 10H18.8C17.1198 10 16.2798 10 15.638 9.67302C15.0735 9.3854 14.6146 8.92646 14.327 8.36197C14 7.72024 14 6.88016 14 5.2V4.8Z" />
      <path d="M14 18.8C14 17.1198 14 16.2798 14.327 15.638C14.6146 15.0735 15.0735 14.6146 15.638 14.327C16.2798 14 17.1198 14 18.8 14H19.2C20.8802 14 21.7202 14 22.362 14.327C22.9265 14.6146 23.3854 15.0735 23.673 15.638C24 16.2798 24 17.1198 24 18.8V19.2C24 20.8802 24 21.7202 23.673 22.362C23.3854 22.9265 22.9265 23.3854 22.362 23.673C21.7202 24 20.8802 24 19.2 24H18.8C17.1198 24 16.2798 24 15.638 23.673C15.0735 23.3854 14.6146 22.9265 14.327 22.362C14 21.7202 14 20.8802 14 19.2V18.8Z" />
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
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <path d="M5 0C5.55228 7.74162e-07 6 0.447716 6 1C6 1.55228 5.55228 2 5 2H4L4.00195 20H22.002V19C22.002 18.4477 22.4497 18 23.002 18C23.5542 18 24.002 18.4477 24.002 19V23C24.002 23.5523 23.5542 24 23.002 24C22.4497 24 22.002 23.5523 22.002 23V22H1.00195C0.449669 22 0.0019533 21.5523 0.00195312 21C0.00195317 20.4477 0.449668 20 1.00195 20H2.00195L2 2H1C0.447715 2 1.70775e-07 1.55228 0 1C4.82823e-08 0.447715 0.447715 -4.82823e-08 1 0H5ZM10.1494 2C10.4858 2 10.6541 1.99997 10.8047 2.04883C10.938 2.09213 11.0609 2.16307 11.165 2.25684C11.2827 2.3628 11.3669 2.50845 11.5352 2.7998L19.7568 17.04C19.9386 17.3549 20.0301 17.5124 20.0166 17.6416C20.0048 17.7543 19.9452 17.8572 19.8535 17.9238C19.7483 18 19.5665 18 19.2031 18H17.7705C17.4342 18 17.2658 18 17.1152 17.9512C16.982 17.9079 16.859 17.8369 16.7549 17.7432C16.6372 17.6372 16.553 17.4916 16.3848 17.2002L14.5371 14H10.002V17.2002C10.002 17.4799 10.0016 17.6197 9.94727 17.7266C9.89933 17.8206 9.8226 17.8974 9.72852 17.9453C9.62162 17.9997 9.48181 18 9.20215 18H7.80176C7.52209 18 7.38229 17.9997 7.27539 17.9453C7.18131 17.8974 7.10458 17.8206 7.05664 17.7266C7.00229 17.6197 7.00195 17.4799 7.00195 17.2002V2.7998C7.00195 2.52014 7.00229 2.38033 7.05664 2.27344C7.10458 2.17936 7.18131 2.10262 7.27539 2.05469C7.38229 2.00034 7.52209 2 7.80176 2H10.1494ZM10.002 12H13.3828L10.002 6.14355V12Z" />
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
  const disabled = opts.disabled === true;
  return [
    'flex h-8 min-w-0 flex-1 items-center justify-center p-0 transition-colors',
    hasIcon ? 'text-xs' : '',
    active ? 'text-accent rounded-md' : `text-gray-800 ${disabled ? '' : 'hover:bg-black/[0.06]'}`,
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
  disabled = false,
}) {
  const shouldShowTooltip = (opt) =>
    !disabled && opt?.tooltip !== false && (Boolean(opt?.title) || Boolean(opt?.Icon));

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
          const showTip = shouldShowTooltip(opt) && tip;
          const btn = (
            <button
              type="button"
              aria-label={opt['aria-label'] ?? tip}
              aria-pressed={active}
              aria-disabled={disabled || undefined}
              className={`${iconRailSegmentClass(active, { hasIcon, disabled })} ${opt.className ?? ''} disabled:opacity-40`.trim()}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
            >
              {Icon ? (
                <Icon className="h-4 w-4 shrink-0" />
              ) : (
                <span className={opt.labelClassName ?? ''}>{opt.label}</span>
              )}
            </button>
          );
          return showTip ? (
            <Tooltip key={opt.value} content={tip} className="min-w-0 flex-1">
              {btn}
            </Tooltip>
          ) : (
            <React.Fragment key={opt.value}>{btn}</React.Fragment>
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
          const showTip = shouldShowTooltip(opt) && tip;
          const btn = (
            <button
              type="button"
              aria-label={tip}
              aria-pressed={active}
              aria-disabled={disabled || undefined}
              className={`relative flex min-h-8 w-full min-w-0 items-center justify-center px-1 py-2 text-center text-xs font-medium transition-colors ${
                active
                  ? 'z-[1] bg-accent text-white'
                  : `bg-white text-gray-600 ${disabled ? '' : 'hover:text-accent'}`
              } disabled:opacity-40`}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : <span>{opt.label}</span>}
            </button>
          );
          return showTip ? (
            <Tooltip key={opt.value} content={tip} className="w-full">
              {btn}
            </Tooltip>
          ) : (
            <React.Fragment key={opt.value}>{btn}</React.Fragment>
          );
        })}
      </div>
    );
  }

  if (variant === 'pairOutline') {
    return (
      <div className={`flex min-w-0 flex-wrap items-center gap-4 ${className}`.trim()} role="group">
        {options.map((opt) => {
          const Icon = opt.Icon;
          const active = value === opt.value;
          const tip = opt.title ?? opt.label;
          const showTip = shouldShowTooltip(opt) && tip;
          const btn = (
            <button
              type="button"
              aria-label={tip}
              aria-pressed={active}
              aria-disabled={disabled || undefined}
              className={`flex min-h-10 w-32 shrink-0 items-center justify-center rounded-full border px-3 py-1.5 text-center text-sm uppercase font-semibold transition-colors ${
                active
                  ? 'border-accent bg-accent text-white'
                  : `border-gray-200 bg-white text-gray-900 ${disabled ? '' : 'hover:text-white hover:bg-black/[0.9] hover:border-black/[0.9]'}`
              } disabled:opacity-40`}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : opt.label}
            </button>
          );
          return showTip ? (
            <Tooltip key={opt.value} content={tip} className="shrink-0">
              {btn}
            </Tooltip>
          ) : (
            <React.Fragment key={opt.value}>{btn}</React.Fragment>
          );
        })}
      </div>
    );
  }

  if (variant === 'surface') {
    const n = options.length;
    const activeIndexRaw = options.findIndex((o) => o.value === value);
    const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : 0;
    return (
      <div
        className={`group flex min-w-0 overflow-hidden rounded-full bg-gray-50 transition-colors ${disabled ? '' : 'hover:bg-gray-100'} ${className}`.trim()}
        role={label ? 'group' : undefined}
        aria-label={label}
      >
        <div className="relative flex min-w-0 flex-1 overflow-hidden rounded-full">
          {n > 0 ? (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent transition-transform duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]"
              style={{ width: `${100 / n}%`, transform: `translateX(${activeIndex * 100}%)` }}
              aria-hidden
            />
          ) : null}
          {options.map((opt) => {
            const Icon = opt.Icon;
            const tip = opt.title ?? opt.label;
            const active = value === opt.value;
            const showTip = shouldShowTooltip(opt) && tip;
            const btn = (
              <button
                type="button"
                aria-label={tip}
                aria-pressed={active}
              aria-disabled={disabled || undefined}
                className={`relative z-10 flex min-h-8 min-w-0 flex-1 items-center justify-center rounded-full px-1 py-2 text-center text-xs uppercase font-semibold transition-colors ${
                  active ? 'text-white' : `text-gray-800 ${disabled ? '' : 'hover:text-gray-900'}`
              } disabled:opacity-40`}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0" /> : <span>{opt.label}</span>}
              </button>
            );
            return showTip ? (
              <Tooltip key={opt.value} content={tip} className="min-w-0 flex-1">
                {btn}
              </Tooltip>
            ) : (
              <React.Fragment key={opt.value}>{btn}</React.Fragment>
            );
          })}
        </div>
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
            aria-disabled={disabled || undefined}
            disabled={disabled}
            className={`flex-1 py-1.5 text-sm font-medium text-center transition-colors ${
              i === 0 ? 'rounded-l-md' : ''
            } ${i === n - 1 ? 'rounded-r-md' : ''} ${
              value === opt.value
                ? 'bg-accent text-white'
                : `bg-white text-accent bg-opacity-60 ${disabled ? '' : 'hover:bg-opacity-80'}`
            } disabled:opacity-40`}
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
            aria-disabled={disabled || undefined}
            disabled={disabled}
            className={`px-3 text-xs transition-colors ${
              value === opt.value
                ? 'bg-accent text-white'
                : `text-accent ${disabled ? '' : 'hover:bg-accent-soft'}`
            } disabled:opacity-40`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
