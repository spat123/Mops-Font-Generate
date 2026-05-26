import {
  buildFontsourceStylePickerProps,
  buildGoogleStylePickerProps,
} from '../../utils/fontDownloadStylePicker';

export function buildCatalogDownloadButtonProps({
  family,
  item,
  onDownloadZip,
  onDownloadAsFormat,
  onDownloadVariableVariant,
  showVariable = false,
  /** google entry | fontsource item */
  catalogEntry = null,
  catalogSource = null,
}) {
  const resolvedFamily = String(family || '').trim();
  const entry = catalogEntry ?? item;
  const source = String(catalogSource || '').trim();
  const stylePicker =
    source === 'google' || (!source && entry?.family && Array.isArray(entry?.downloadStyles))
      ? buildGoogleStylePickerProps(entry)
      : source === 'fontsource' || (!source && (entry?.slug || entry?.id) && Array.isArray(entry?.weights))
        ? buildFontsourceStylePickerProps(entry)
        : null;

  return {
    primaryLabel: 'Скачать',
    primaryAriaLabel: resolvedFamily ? `Скачать пакет ${resolvedFamily}` : 'Скачать пакет',
    onPrimaryClick: () => onDownloadZip?.(item),
    stylePicker,
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

