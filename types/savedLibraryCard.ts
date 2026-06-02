import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';

export type SavedLibraryCardMenuItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  tone?: string;
  disabled?: boolean;
  submenuItems?: SavedLibraryCardMenuItem[];
  onSelect?: () => void;
};

export type SavedLibraryCardViewItem = {
  id: string;
  selected?: boolean;
  batchSelected?: boolean;
  title?: string;
  recentlyAdded?: boolean;
  subtitle?: string;
  subtitleParts?: string[];
  subtitleLeftParts?: string[];
  subtitleRightParts?: string[];
  subtitleClassName?: string;
  previewStyle?: CSSProperties;
  onOpen?: () => void | Promise<void>;
  openAriaLabel?: string;
  onCardClick?: (event?: MouseEvent) => void;
  onPointerDown?: (event: PointerEvent) => void;
  onPointerUp?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
  onPointerCancel?: (event: PointerEvent) => void;
  downloadSplitButtonProps?: Record<string, unknown> | null;
  menuItems?: SavedLibraryCardMenuItem[];
  cornerAction?: ReactNode;
  /** Держать cornerAction видимым без hover (например, галочка «уже в библиотеке»). */
  pinCornerActionVisible?: boolean;
  variant?: 'default' | 'tall' | 'catalog';
  previewClassName?: string;
};

export type SavedLibraryCatalogSearchRow = {
  id: string;
  source: 'google' | 'fontsource';
  family: string;
  entry?: Record<string, unknown>;
  item?: Record<string, unknown>;
  slug?: string;
  alreadyInLibrary?: boolean;
};
