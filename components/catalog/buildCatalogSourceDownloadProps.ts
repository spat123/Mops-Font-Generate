import { buildCatalogDownloadButtonProps } from './buildCatalogDownloadButtonProps';
import { getCatalogSourceMeta } from './CatalogSourceLogos';
import { bestDownloadSourceId } from '../../utils/unifiedCatalogMerge';
import { wrapDownloadPropsWithGoogleFallback } from '../../utils/catalogPreferredSource';
import {
  downloadFontshareAsFormat,
  downloadFontsharePackageZip,
  downloadFontshareVariableVariant,
  downloadFontsourceAsFormat,
  downloadFontsourcePackageZip,
  downloadFontsourceVariableVariant,
  downloadGoogleAsFormat,
  downloadGooglePackageZip,
  downloadGoogleVariableVariant,
} from '../../utils/catalogDownloadActions';
import {
  CATALOG_EXTERNAL_DOWNLOAD_PRIMARY_LABEL,
  isCatalogExternalDownloadButtonProps,
} from './catalogExternalDownload';
import type { CatalogDownloadButtonProps, CatalogSourceId } from '../../types/catalog';
import type { MergedCatalogItem } from '../../types/catalog';

export { CATALOG_EXTERNAL_DOWNLOAD_PRIMARY_LABEL, isCatalogExternalDownloadButtonProps } from './catalogExternalDownload';

export function catalogItemCanOpenInEditor(
  item: MergedCatalogItem | CatalogSearchableItemLoose,
  downloadButtonProps?: CatalogDownloadButtonProps | null,
): boolean {
  if (isCatalogExternalDownloadButtonProps(downloadButtonProps)) return false;
  return (Array.isArray(item?.sources) ? item.sources : []).some(
    (s) => s?.canOpenInEditor && s?.raw,
  );
}

const DOWNLOAD_HANDLERS: Record<
  string,
  {
    onDownloadZip: (item: Record<string, unknown>) => unknown;
    onDownloadAsFormat: (item: Record<string, unknown>, format: string) => unknown;
    onDownloadVariableVariant: (item: Record<string, unknown>) => unknown;
  }
> = {
  google: {
    onDownloadZip: downloadGooglePackageZip,
    onDownloadAsFormat: downloadGoogleAsFormat,
    onDownloadVariableVariant: downloadGoogleVariableVariant,
  },
  fontsource: {
    onDownloadZip: downloadFontsourcePackageZip,
    onDownloadAsFormat: downloadFontsourceAsFormat,
    onDownloadVariableVariant: downloadFontsourceVariableVariant,
  },
  fontshare: {
    onDownloadZip: downloadFontsharePackageZip,
    onDownloadAsFormat: downloadFontshareAsFormat,
    onDownloadVariableVariant: downloadFontshareVariableVariant,
  },
};

export function buildCatalogSourceDownloadProps({
  sourceId,
  raw,
  displayName,
  isVariable = false,
}: {
  sourceId: CatalogSourceId | string;
  raw: Record<string, unknown>;
  displayName?: string;
  isVariable?: boolean;
}): CatalogDownloadButtonProps | null {
  const handlers = DOWNLOAD_HANDLERS[sourceId];
  if (!handlers || !raw) return null;
  return buildCatalogDownloadButtonProps({
    family: displayName,
    item: raw,
    catalogEntry: raw,
    catalogSource: sourceId,
    ...handlers,
    showVariable: Boolean(isVariable),
  });
}

export function buildCatalogTrialDownloadProps({
  displayName,
  raw,
  onOpenTrialPage,
}: {
  displayName?: string;
  raw: Record<string, unknown>;
  onOpenTrialPage?: (raw: Record<string, unknown>) => void;
}): CatalogDownloadButtonProps {
  return {
    primaryLabel: CATALOG_EXTERNAL_DOWNLOAD_PRIMARY_LABEL,
    primaryAriaLabel: `Скачать trial ${displayName} на Fontfabric`,
    onPrimaryClick: () => onOpenTrialPage?.(raw),
    menuItems: [],
  };
}

export function buildCatalogItemOpenButtonProps(
  item: MergedCatalogItem | CatalogSearchableItemLoose,
  onOpenInEditor: (item: MergedCatalogItem | CatalogSearchableItemLoose) => unknown,
  downloadButtonProps?: CatalogDownloadButtonProps | null,
): CatalogDownloadButtonProps | null {
  if (typeof onOpenInEditor !== 'function') return null;
  const resolvedDownloadProps =
    downloadButtonProps !== undefined
      ? downloadButtonProps
      : buildCatalogItemDownloadButtonProps(item as MergedCatalogItem);
  if (!catalogItemCanOpenInEditor(item, resolvedDownloadProps)) return null;

  const displayName = item?.displayName || item?.familyKey || '';
  return {
    primaryLabel: 'Открыть',
    primaryAriaLabel: displayName ? `Открыть ${displayName} в редакторе` : 'Открыть в редакторе',
    onPrimaryClick: () => onOpenInEditor(item),
    sourceTabs: null,
  };
}

type CatalogSearchableItemLoose = {
  displayName?: string;
  familyKey?: string;
  sources?: Array<{
    id?: string;
    raw?: Record<string, unknown> | null;
    canOpenInEditor?: boolean;
    canDownloadHere?: boolean;
  }>;
};

function filterDownloadSourceTabs(item: CatalogSearchableItemLoose) {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const hasFontsource = sources.some((s) => s?.id === 'fontsource');
  const hasGoogleOrFontsource = sources.some((s) => s?.id === 'google' || s?.id === 'fontsource');
  const hasRealDownload = sources.some((s) => s?.id !== 'demo' && s?.canDownloadHere);

  return sources.filter((s) => {
    if (!s?.id || !s?.raw) return false;
    if (s.id === 'google' && hasFontsource) return false;
    if (s.id === 'demo') return !hasGoogleOrFontsource && !hasRealDownload;
    if (s.id === 'fontshare' && s.canDownloadHere !== true) {
      return !hasGoogleOrFontsource;
    }
    return true;
  });
}

export function buildCatalogItemDownloadButtonProps(
  item: MergedCatalogItem,
  {
    onOpenTrialPage,
    onUploadTrial: _onUploadTrial,
  }: {
    onOpenTrialPage?: (raw: Record<string, unknown>) => void;
    onUploadTrial?: unknown;
  } = {},
): CatalogDownloadButtonProps | null {
  const displayName = item?.displayName || item?.familyKey || '';
  const primarySource = item?.primarySource || bestDownloadSourceId(item);
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const fontsourceRaw = sources.find((s) => s?.id === 'fontsource')?.raw || null;
  const googleRaw = sources.find((s) => s?.id === 'google')?.raw || null;

  const buildForSource = (sourceId: string, sourceRaw: Record<string, unknown> | null) => {
    if (sourceId === 'demo') {
      return buildCatalogTrialDownloadProps({
        displayName,
        raw: sourceRaw || {},
        onOpenTrialPage,
      });
    }
    return buildCatalogSourceDownloadProps({
      sourceId,
      raw: sourceRaw || {},
      displayName,
      isVariable: Boolean(item?.isVariable),
    });
  };

  const tabs = filterDownloadSourceTabs(item).map((s) => {
    const meta = getCatalogSourceMeta(s.id || '');
    return {
      id: s.id || '',
      triggerLabel: meta?.title || s.id,
      ariaLabel: meta?.['aria-label'] || meta?.title || s.id,
      Logo: meta?.Logo,
      ...buildForSource(s.id || '', s.raw || null),
    };
  });

  const primaryRaw =
    sources.find((s) => s?.id === primarySource)?.raw || sources[0]?.raw || null;
  const primaryDownloadProps = buildForSource(primarySource, primaryRaw);

  if (fontsourceRaw && googleRaw && primarySource === 'fontsource') {
    const googleFallbackProps = buildForSource('google', googleRaw);
    return wrapDownloadPropsWithGoogleFallback(
      primaryDownloadProps,
      googleFallbackProps,
    ) as CatalogDownloadButtonProps;
  }

  if (tabs.length > 1) {
    return {
      ...primaryDownloadProps,
      sourceTabs: tabs,
      defaultSourceTabId: primarySource,
    };
  }
  return primaryDownloadProps;
}
