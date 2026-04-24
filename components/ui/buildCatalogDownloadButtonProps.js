export function buildCatalogDownloadButtonProps({
  family,
  item,
  onDownloadZip,
  onDownloadAsFormat,
  onDownloadVariableVariant,
  showVariable = false,
}) {
  const resolvedFamily = String(family || '').trim();
  return {
    primaryLabel: 'Скачать',
    primaryAriaLabel: resolvedFamily ? `Скачать пакет ${resolvedFamily}` : 'Скачать пакет',
    onPrimaryClick: () => onDownloadZip?.(item),
    menuItems: [
      { key: 'zip', label: 'ZIP (по умолчанию)', onSelect: () => onDownloadZip?.(item) },
      { key: 'ttf', label: 'TTF', onSelect: () => onDownloadAsFormat?.(item, 'ttf') },
      { key: 'otf', label: 'OTF', onSelect: () => onDownloadAsFormat?.(item, 'otf') },
      { key: 'woff', label: 'WOFF', onSelect: () => onDownloadAsFormat?.(item, 'woff') },
      { key: 'woff2', label: 'WOFF2', onSelect: () => onDownloadAsFormat?.(item, 'woff2') },
      {
        key: 'variable',
        label: 'Variable вариант',
        hidden: !showVariable,
        onSelect: () => onDownloadVariableVariant?.(item),
      },
    ],
  };
}

