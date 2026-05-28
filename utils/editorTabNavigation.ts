import { EMPTY_PREFIX } from '../components/ui/EditorTabBar';
import type { SessionFontRecord } from '../types/editorFonts';

export type EditorTabAfterClose = {
  mainTab: string;
  selectedFont: SessionFontRecord | null;
};

/**
 * Куда перейти после закрытия вкладки шрифта (следующий видимый, empty-slot или библиотека).
 */
export function resolveEditorTabAfterFontClose({
  fonts,
  closedLibraryFontIds,
  excludeFontId,
  emptySlotIds,
}: {
  fonts: SessionFontRecord[];
  closedLibraryFontIds: string[];
  excludeFontId: string;
  emptySlotIds: string[];
}): EditorTabAfterClose {
  const closed = Array.isArray(closedLibraryFontIds) ? closedLibraryFontIds : [];
  const slots = Array.isArray(emptySlotIds) ? emptySlotIds : [];
  const list = Array.isArray(fonts) ? fonts : [];

  const nextVisible =
    list.find((font) => font.id !== excludeFontId && !closed.includes(font.id)) || null;

  if (nextVisible) {
    return { mainTab: nextVisible.id, selectedFont: nextVisible };
  }
  if (slots.length > 0) {
    return { mainTab: `${EMPTY_PREFIX}${slots[0]}`, selectedFont: null };
  }
  return { mainTab: 'library', selectedFont: null };
}
