export type CatalogSourceId = 'google' | 'fontsource' | 'fontshare' | 'demo';

/** Строка одного источника в unified-карточке каталога. */
export type CatalogSourceRef = {
  id: string;
  raw?: Record<string, unknown> | null;
  family?: string;
  familyKey?: string;
  licenseType?: string;
  canRedistribute?: boolean;
  canOpenInEditor?: boolean;
  canDownloadHere?: boolean;
};

/** Источник после merge (полная форма). */
export type UnifiedCatalogSource = {
  id: CatalogSourceId | string;
  raw: Record<string, unknown> | null;
  family: string;
  familyKey: string;
  licenseType: string;
  canRedistribute: boolean;
  canOpenInEditor: boolean;
  canDownloadHere: boolean;
};

export type CatalogRow = Record<string, unknown>;

/** Элемент каталога с полями для поиска и фильтрации. */
export type CatalogSearchableItem = {
  displayName?: string;
  category?: string;
  feelings?: string[];
  shapes?: string[];
  subsets?: string[];
  searchTokens?: string[];
  searchFamilyVariants?: string[];
  family?: string;
  label?: string;
  familyKey?: string;
  primarySource?: string;
  isVariable?: boolean;
  hasItalic?: boolean;
  styleCount?: number;
  sources?: CatalogSourceRef[] | UnifiedCatalogSource[];
  [key: string]: unknown;
};

/** Unified-элемент каталога (семейство + sources) — минимальная форма. */
export type CatalogUnifiedItem = {
  family?: string;
  sources?: CatalogSourceRef[];
  displayName?: string;
  familyKey?: string;
  primarySource?: string;
  isVariable?: boolean;
};

/** Семейство после mergeCatalogSources. */
export type MergedCatalogItem = CatalogSearchableItem & {
  familyKey: string;
  displayName: string;
  feelings: string[];
  shapes: string[];
  calligraphy: string[];
  subsets: string[];
  isVariable: boolean;
  hasItalic: boolean;
  styleCount: number;
  sources: UnifiedCatalogSource[];
  primarySource: string;
};

export type CatalogFilterOmitKey =
  | 'category'
  | 'subset'
  | 'variable'
  | 'italic'
  | 'license'
  | 'feeling'
  | 'shape'
  | 'calligraphy'
  | 'role'
  | 'search';

export type CatalogFilterOptions<T = CatalogSearchableItem> = {
  searchQuery?: string;
  searchPrepared?: import('../utils/searchMatching').PreparedCatalogSearchQuery | null;
  getSearchTokens?: (item: T) => string[];
  filterCategory?: string;
  getCategory?: (item: T) => string | undefined;
  filterSubset?: string[];
  getSubsets?: (item: T) => string[] | undefined;
  filterVariable?: 'all' | 'variable' | 'static' | string;
  isVariable?: (item: T) => boolean;
  filterItalicOnly?: boolean;
  hasItalic?: (item: T) => boolean;
  filterLicense?: string;
  getLicenseKeys?: (item: T) => string[];
  filterFeeling?: string;
  getFeelingKeys?: (item: T) => string[];
  filterShape?: string;
  getShapeKeys?: (item: T) => string[];
  filterCalligraphy?: string;
  getCalligraphyKeys?: (item: T) => string[];
  filterRole?: string;
  preserveKeys?: Set<string> | string[] | null;
  getPreserveKey?: (item: T) => string;
};

export type CatalogSelectOption = {
  value?: string;
  label?: string;
  kind?: string;
  rightLabel?: string;
  [key: string]: unknown;
};

export type CatalogSortOption = {
  value: string;
  label: string;
};

export type CatalogDownloadMenuItem = {
  key: string;
  label?: string;
  hidden?: boolean;
  disabled?: boolean;
  onSelect?: () => unknown;
};

export type CatalogStylePickerProps = {
  familyLabel?: string;
  styles?: unknown[];
  formats?: string[];
  onDownload?: (selectedStyles: unknown[], format: string) => unknown;
  disabled?: boolean;
};

/** Вкладка источника в split-кнопках каталога (скачать / открыть). */
export type CatalogSourceTab = {
  id: string;
  triggerLabel?: string;
  ariaLabel?: string;
  Logo?: import('react').ComponentType<{ className?: string }>;
  primaryLabel?: string;
  primaryAriaLabel?: string;
  onPrimaryClick?: () => unknown;
  menuItems?: CatalogDownloadMenuItem[];
  stylePicker?: CatalogStylePickerProps | null;
  onOpen?: () => unknown;
  openAriaLabel?: string;
};

export type CatalogDownloadButtonProps = {
  primaryLabel?: string;
  primaryAriaLabel?: string;
  onPrimaryClick?: () => unknown;
  menuItems?: CatalogDownloadMenuItem[];
  stylePicker?: CatalogStylePickerProps | null;
  sourceTabs?: CatalogSourceTab[] | null;
  defaultSourceTabId?: string | null;
};

export type UnifiedCatalogStats = {
  googleTotal: number;
  fontsourceTotal: number;
  fontshareTotal: number;
  trialTotal: number;
  googleUniqueFamilies: number;
  fontsourceUniqueFamilies: number;
  fontshareUniqueFamilies: number;
  trialUniqueFamilies: number;
  uniqueFamiliesAll: number;
};
