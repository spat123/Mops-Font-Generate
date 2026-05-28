import {
  buildFontsourceStylePickerProps,
  buildGoogleStylePickerProps,
} from '../../utils/fontDownloadStylePicker';
import { openFontshareExternalDownload } from '../../utils/fontshareDownloadActions';
import type { CatalogDownloadButtonProps } from '../../types/catalog';
import { CATALOG_EXTERNAL_DOWNLOAD_PRIMARY_LABEL } from './catalogExternalDownload';

export type BuildCatalogDownloadButtonParams = {
  family?: string;
  item?: Record<string, unknown> | null;
  onDownloadZip?: (item: Record<string, unknown> | null | undefined) => unknown;
  onDownloadAsFormat?: (item: Record<string, unknown> | null | undefined, format: string) => unknown;
  onDownloadVariableVariant?: (item: Record<string, unknown> | null | undefined) => unknown;
  showVariable?: boolean;
  catalogEntry?: Record<string, unknown> | null;
  catalogSource?: string | null;
};

export function buildCatalogDownloadButtonProps({
  family,
  item,
  onDownloadZip,
  onDownloadAsFormat,
  onDownloadVariableVariant,
  showVariable = false,
  catalogEntry = null,
  catalogSource = null,
}: BuildCatalogDownloadButtonParams): CatalogDownloadButtonProps {
  const resolvedFamily = String(family || '').trim();
  const entry = catalogEntry ?? item;
  const source = String(catalogSource || entry?.source || '').trim();

  if (source === 'fontshare') {
    return {
      primaryLabel: CATALOG_EXTERNAL_DOWNLOAD_PRIMARY_LABEL,
      primaryAriaLabel: resolvedFamily
        ? `Скачать ${resolvedFamily} на Fontshare`
        : 'Скачать на Fontshare',
      onPrimaryClick: () =>
        openFontshareExternalDownload(entry as Parameters<typeof openFontshareExternalDownload>[0]),
      menuItems: [],
      stylePicker: null,
    };
  }

  const stylePicker =
    source === 'google' || (!source && entry?.family && Array.isArray(entry?.downloadStyles))
      ? buildGoogleStylePickerProps(entry)
      : source === 'fontsource' || (!source && (entry?.slug || entry?.id) && Array.isArray(entry?.weights))
        ? buildFontsourceStylePickerProps(entry)
        : null;

  const primaryLabel = 'Скачать';
  const primaryAriaLabel = resolvedFamily ? `Скачать пакет ${resolvedFamily}` : 'Скачать пакет';

  return {
    primaryLabel,
    primaryAriaLabel,
    onPrimaryClick: () => onDownloadZip?.(item),
    stylePicker: stylePicker as CatalogDownloadButtonProps['stylePicker'],
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
