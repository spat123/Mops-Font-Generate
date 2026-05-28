import type { CatalogDownloadButtonProps } from '../../types/catalog';

export const CATALOG_EXTERNAL_DOWNLOAD_PRIMARY_LABEL = 'Скачать с источника';

/** Скачивание ведёт на внешний сайт (Fontshare, Fontfabric trial и т.п.). */
export function isCatalogExternalDownloadButtonProps(
  props: CatalogDownloadButtonProps | null | undefined,
): boolean {
  if (!props || typeof props !== 'object') return false;
  if (props.primaryLabel === CATALOG_EXTERNAL_DOWNLOAD_PRIMARY_LABEL) return true;
  const tabs = Array.isArray(props.sourceTabs) ? props.sourceTabs : [];
  if (tabs.length === 0) return false;
  const defaultId = props.defaultSourceTabId;
  const active = defaultId ? tabs.find((t) => t?.id === defaultId) : tabs[0];
  return active?.primaryLabel === CATALOG_EXTERNAL_DOWNLOAD_PRIMARY_LABEL;
}
