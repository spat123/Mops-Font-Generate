/** Короткая подпись в пунктах меню («Создать» vs «Добавить библиотеку»). */
export function getLibraryCreateMenuLabel(hasLibraries) {
  return hasLibraries ? 'Добавить библиотеку' : 'Создать';
}

/** Tooltip и aria-label для кнопки создания библиотеки. */
export function getLibraryCreateActionHint(hasLibraries, { proLocked = false } = {}) {
  if (proLocked) return 'Доступно в Pro';
  return hasLibraries ? 'Добавить библиотеку' : 'Создать библиотеку';
}
