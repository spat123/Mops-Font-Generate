/**
 * Общие стили «хром»-полосы: нижний тулбар превью и подвал сайдбара (одинаковая высота и отступы).
 */
export const EDITOR_CHROME_BAR_SURFACE =
  'items-center border-t border-gray-200 bg-white pl-6';

  export const EDITOR_CHROME_BAR_SURFACE_RESET_BUTTON =
  'items-center bg-white px-4 pb-2';

/** Нижняя панель превью — flex-футер (привязка к низу области превью, без скролла страницы) */
export const EDITOR_PREVIEW_BOTTOM_BAR_CLASS = `relative z-10 flex w-full shrink-0 min-h-[52px] ${EDITOR_CHROME_BAR_SURFACE}`;

/** Подвал сайдбара (сброс и т.п.) */
export const EDITOR_SIDEBAR_FOOTER_BAR_CLASS = `mt-auto flex shrink-0 min-h-8 ${EDITOR_CHROME_BAR_SURFACE_RESET_BUTTON}`;
