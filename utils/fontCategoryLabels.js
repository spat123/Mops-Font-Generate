const FONT_CATEGORY_LABELS_RU = {
  display: 'Акцидентные',
  handwriting: 'Рукописные',
  monospace: 'Моноширинные',
  'sans-serif': 'Гротески',
  serif: 'Антиквы',
};

function normalizeFontCategoryKey(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
}

export function getFontCategoryLabelRu(category) {
  const normalized = normalizeFontCategoryKey(category);
  return FONT_CATEGORY_LABELS_RU[normalized] || String(category || '').trim();
}

export function compareFontCategoryLabelsRu(a, b) {
  return getFontCategoryLabelRu(a).localeCompare(getFontCategoryLabelRu(b), 'ru', {
    sensitivity: 'base',
  });
}
