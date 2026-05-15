import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';

/** После F5 восстанавливаем активную вкладку редактора (иначе остаётся «Новый» и сбрасывается выбор). */
export const EDITOR_MAIN_TAB_LS_KEY = 'editorMainTab';

/** Список id слотов «Новый» (пустой массив = все закрыты, не создаём фиктивную вкладку). */
export const EDITOR_EMPTY_SLOTS_LS_KEY = 'editorEmptySlots';

/** Вкладки шрифтов из библиотеки, закрытые крестиком (остаются в сессии, но скрыты в полосе) — восстановление после F5. */
export const EDITOR_CLOSED_LIBRARY_FONT_IDS_LS_KEY = 'editorClosedLibraryFontTabIds';

/** Внутри экрана «Все шрифты»: активная внутренняя вкладка каталога или библиотеки. */
export const FONTS_LIBRARY_INNER_TAB_LS_KEY = 'fontsLibraryInnerTab';

export const SESSION_FONT_ORDER_LS_KEY = 'dinamicSessionFontOrder';

/** Лёгкий снимок вкладок шрифтов для первого кадра после F5 (пока IndexedDB не отдал blobs). */
export const SESSION_FONT_TABS_PREVIEW_KEY = 'dinamicSessionFontTabsPreview';

/** До useLayoutEffect не подсвечиваем «Все шрифты» / не показываем контент — убирает мигание для новых пользователей. */
export const EDITOR_MAIN_TAB_PENDING = '__editorShellPending__';

export function newEmptySlotId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Синхронное восстановление до paint: без лишней вкладки «Новый» и без выбора её вместо сохранённой вкладки. */
export function readEditorShellFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const rawSlots = localStorage.getItem(EDITOR_EMPTY_SLOTS_LS_KEY);
    const savedMain = localStorage.getItem(EDITOR_MAIN_TAB_LS_KEY);

    let emptySlotIds;
    if (rawSlots !== null) {
      const p = JSON.parse(rawSlots);
      emptySlotIds = Array.isArray(p) ? p.filter((x) => typeof x === 'string' && x.length > 0) : [];
    } else if (!savedMain) {
      emptySlotIds = [newEmptySlotId()];
    } else if (savedMain.startsWith(EMPTY_PREFIX)) {
      emptySlotIds = [savedMain.slice(EMPTY_PREFIX.length)];
    } else {
      emptySlotIds = [];
    }

    let mainTabResolved = 'library';
    if (savedMain === 'library') {
      mainTabResolved = 'library';
    } else if (savedMain?.startsWith(EMPTY_PREFIX)) {
      const sid = savedMain.slice(EMPTY_PREFIX.length);
      if (emptySlotIds.includes(sid)) {
        mainTabResolved = savedMain;
      } else {
        mainTabResolved = emptySlotIds.length > 0 ? `${EMPTY_PREFIX}${emptySlotIds[0]}` : 'library';
      }
    } else if (savedMain && savedMain !== 'library') {
      mainTabResolved = savedMain;
    } else if (!savedMain && emptySlotIds.length > 0) {
      mainTabResolved = `${EMPTY_PREFIX}${emptySlotIds[0]}`;
    }

    return { emptySlotIds, mainTab: mainTabResolved };
  } catch {
    const id = newEmptySlotId();
    return { emptySlotIds: [id], mainTab: `${EMPTY_PREFIX}${id}` };
  }
}

export function isFontTabId(tab) {
  return (
    typeof tab === 'string' &&
    tab !== 'library' &&
    tab !== EDITOR_MAIN_TAB_PENDING &&
    !tab.startsWith(EMPTY_PREFIX)
  );
}
