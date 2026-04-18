/** Hover по обводке — каталог Google, сайдбар, VF-экспорт */
export const NATIVE_SELECT_FIELD_INTERACTIVE =
  'transition-[border-color] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:border-black/[0.14]';

/**
 * Стили нативного select под {@link import('./NativeSelect.jsx').NativeSelect}.
 * @param {{ compact?: boolean, placeholderMuted?: boolean }} [opts]
 */
export function nativeSelectFieldClass({ compact = false, placeholderMuted = false } = {}) {
  const sizing = compact ? 'h-9 text-xs' : 'h-10 text-sm';
  return [
    `box-border w-full rounded-md border border-transparent !bg-gray-50 py-0 pl-2 pr-8 text-left leading-normal text-gray-900 ${sizing}`,
    NATIVE_SELECT_FIELD_INTERACTIVE,
    'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 sm:pl-3',
    placeholderMuted ? '!text-gray-900/45' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
