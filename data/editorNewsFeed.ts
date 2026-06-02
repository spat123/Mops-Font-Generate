/**
 * Лента уведомлений редактора (заглушка под будущий API).
 * kind: 'news' | 'updates'
 * Поля: imageUrl (опционально), date, title, summary (для уведомлений), body (полный текст), ctaLabel/ctaHref.
 */

const NEWS_ASSET_BASE = '/assets/News and Update';

export function editorNewsAssetUrl(locale: 'RU' | 'EN', filename: string) {
  return encodeURI(`${NEWS_ASSET_BASE}/${locale}/${filename}`);
}

export const EDITOR_BETA_VERSION = '0.32.06';

/** ISO `YYYY-MM-DD` → `DD.MM.YYYY` для отображения в ленте. */
export function formatEditorNewsDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export const EDITOR_NEWS_FEED = [
  {
    id: 'news-open-beta-0-32-06',
    kind: 'news',
    imageUrl: editorNewsAssetUrl('RU', 'Dinamic post.jpg'),
    imageUrlEn: editorNewsAssetUrl('EN', 'Dinamic post.jpg'),
    date: '2026-06-02',
    title: 'Открытая бета: полный доступ бесплатно',
    summary:
      'На время открытой беты DINAMIC FONT открыт для всех зарегистрированных пользователей бесплатно. Можно создавать библиотеки, сравнивать шрифты, делиться подборками и пользоваться расширенными возможностями без платного тарифа...',
    body:
      'На время открытой беты DINAMIC FONT открыт для всех зарегистрированных пользователей бесплатно. Можно создавать библиотеки, сравнивать шрифты, делиться подборками и пользоваться расширенными возможностями без платного тарифа.\n\nГостевой режим остаётся для быстрого знакомства, а полный доступ включается после входа в аккаунт. Мы продолжаем собирать обратную связь, улучшать редактор и наполнять базу знаний.',
    ctaLabel: 'Подробнее',
    ctaHref: '/help?tab=news',
  },
  {
    id: 'update-0-32-06',
    kind: 'updates',
    imageUrl: editorNewsAssetUrl('RU', 'Dinamic post update 0.26.05.jpg'),
    imageUrlEn: editorNewsAssetUrl('EN', 'Dinamic post update 0.26.05.jpg'),
    date: '2026-06-02',
    title: `Обновление ${EDITOR_BETA_VERSION}`,
    summary:
      'Версия 0.32.06 стала большим шагом для открытой беты: сервис быстрее работает, удобнее открывает каталоги и лучше помогает выбирать шрифты. Также исправлены различные ошибки...',
    body:
      'Версия 0.32.06 стала большим шагом для открытой беты: сервис быстрее работает, удобнее открывает каталоги и лучше помогает выбирать шрифты.\n\nЧто изменилось:\n• оптимизирован интерфейс и общая скорость работы редактора;\n• улучшена навигация по каталогам и карточкам шрифтов;\n• поиск по каталогу стал точнее: добавлены новые фильтры и понятные состояния;\n• добавлены новые шрифты и улучшена работа с подключёнными источниками;\n• в левой панели появились настройки письма: латиница, кириллица и другие варианты текста для проверки шрифта;\n• расширены возможности OpenType и настройки вариативных шрифтов;\n• улучшены библиотеки, шаринг подборок, сообщения об ошибках и блок поддержки проекта;\n• добавлена база знаний со статьями, руководствами и новостями продукта;\n• исправлены различные ошибки в интерфейсе, превью и работе с библиотеками.',
    ctaLabel: 'Подробнее',
    ctaHref: '/help?tab=updates',
  },
  {
    id: 'news-beta-0-20-05',
    kind: 'news',
    imageUrl: editorNewsAssetUrl('RU', 'Dinamic post.png'),
    imageUrlEn: editorNewsAssetUrl('EN', 'Dinamic post.png'),
    date: '2026-05-19',
    title: 'Закрытая бета 0.20.05',
    body:
      'Актуальная версия редактора — 0.20.05. Сейчас идёт закрытая бета: интерфейс и сценарии ещё дорабатываются, возможны редкие сбои. Спасибо, что пробуете DINAMIC FONT — пишите, если что-то пойдёт не так, и укажите шаги воспроизведения.',
  },
  {
    id: 'update-0-20-05',
    kind: 'updates',
    imageUrl: editorNewsAssetUrl('RU', 'Dinamic post update.png'),
    imageUrlEn: editorNewsAssetUrl('EN', 'Dinamic post update.png'),
    date: '2026-05-19',
    title: 'Обновление 0.20.05',
    body:
      'Версия 0.20.05: доработки интерфейса, каталогов и библиотек шрифтов. Спасибо за отзывы в закрытой бете — пишите, если заметите сбой, и укажите шаги воспроизведения.',
  },
];

export function getEditorFeedByKind(kind: string) {
  return EDITOR_NEWS_FEED.filter((item) => (item.kind || 'news') === kind);
}

/** id последней записи в ленте «Обновления» (для бейджа непрочитанного). */
export function getLatestUpdateId() {
  const updates = getEditorFeedByKind('updates');
  if (updates.length === 0) return null;
  return updates[0]?.id ?? null;
}
