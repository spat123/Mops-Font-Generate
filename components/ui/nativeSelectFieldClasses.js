/** Hover по обводке — каталог Google, сайдбар, VF-экспорт */
export const NATIVE_SELECT_FIELD_INTERACTIVE =
  'transition-[border-color] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:border-black/[0.14]';

/**
 * Триггер {@link import('./CustomSelect.jsx').CustomSelect} (и бывший нативный select).
 * @param {{ compact?: boolean, placeholderMuted?: boolean }} [opts]
 */
export function customSelectTriggerClass({ compact = false, placeholderMuted = false } = {}) {
  const sizing = compact
    ? 'h-8 min-h-8 text-sm leading-tight'
    : 'h-10 min-h-10 text-sm leading-normal';
  return [
    `box-border w-full rounded-md border border-transparent !bg-gray-50 py-0 pl-2 pr-8 text-left uppercase font-semibold text-gray-900 ${sizing}`,
    NATIVE_SELECT_FIELD_INTERACTIVE,
    'focus:border-black/[0.14] focus:outline-none sm:pl-3',
    placeholderMuted ? '!text-gray-900/45 hover:!text-gray-900' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** @deprecated Используйте {@link customSelectTriggerClass}; оставлено для совместимости. */
export function nativeSelectFieldClass(opts) {
  return customSelectTriggerClass(opts);
}
