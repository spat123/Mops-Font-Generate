/**
 * Лента уведомлений редактора (заглушка под будущий API).
 * kind: 'news' | 'updates'
 * Поля: imageUrl (опционально), date, title, body (plain text).
 */

const NEWS_ASSET_BASE = '/assets/News and Update';

/** @param {'RU' | 'EN'} [locale] @param {string} filename */
export function editorNewsAssetUrl(locale, filename) {
  return encodeURI(`${NEWS_ASSET_BASE}/${locale}/${filename}`);
}

export const EDITOR_BETA_VERSION = '0.20.05';

/** ISO `YYYY-MM-DD` → `DD.MM.YYYY` для отображения в ленте. */
export function formatEditorNewsDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export const EDITOR_NEWS_FEED = [
  {
    id: 'news-beta-0-20-05',
    kind: 'news',
    imageUrl: editorNewsAssetUrl('RU', 'Dinamic post.png'),
    imageUrlEn: editorNewsAssetUrl('EN', 'Dinamic post.png'),
    date: '2026-05-19',
    title: `Закрытая бета ${EDITOR_BETA_VERSION}`,
    body:
      `Актуальная версия редактора — ${EDITOR_BETA_VERSION}. Сейчас идёт закрытая бета: интерфейс и сценарии ещё дорабатываются, возможны редкие сбои. Спасибо, что пробуете DINAMIC FONT — пишите, если что-то пойдёт не так, и укажите шаги воспроизведения.`,
  },
  {
    id: 'update-0-20-05',
    kind: 'updates',
    imageUrl: editorNewsAssetUrl('RU', 'Dinamic post update.png'),
    imageUrlEn: editorNewsAssetUrl('EN', 'Dinamic post update.png'),
    date: '2026-05-19',
    title: `Обновление ${EDITOR_BETA_VERSION}`,
    body:
      'Режимы превью Plain / Waterfall / Glyphs / Styles, тёмная тема, сохранение настроек превью для каждого шрифта, вход через Google и Яндекс, генерация статических файлов из вариативных шрифтов (лимиты для гостей и Free). Дальше — стабилизация и новые возможности Pro.',
  },
];

export function getEditorFeedByKind(kind) {
  return EDITOR_NEWS_FEED.filter((item) => (item.kind || 'news') === kind);
}

/** id последней записи в ленте «Обновления» (для бейджа непрочитанного). */
export function getLatestUpdateId() {
  const updates = getEditorFeedByKind('updates');
  if (updates.length === 0) return null;
  return updates[updates.length - 1]?.id ?? null;
}
