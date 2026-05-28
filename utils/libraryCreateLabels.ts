/** Короткая подпись в пунктах меню («Создать» vs «Добавить библиотеку»). */
export function getLibraryCreateMenuLabel(hasLibraries: boolean): string {
  return hasLibraries ? 'Добавить библиотеку' : 'Создать';
}

/** Tooltip и aria-label для кнопки создания библиотеки. */
export function getLibraryCreateActionHint(
  hasLibraries: boolean,
  { proLocked = false }: { proLocked?: boolean } = {},
): string {
  if (proLocked) return 'Доступно в Pro';
  return hasLibraries ? 'Добавить библиотеку' : 'Создать библиотеку';
}
