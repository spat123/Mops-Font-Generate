import type { ReactNode } from 'react';
import { CatalogAddTargetMenu, type CatalogAddTargetAppearance } from './CatalogAddTargetMenu';
import {
  addLibraryEntryToLibrary,
  requestCreateLibraryFromEntry,
} from '../../utils/libraryEntryActions';
import type { SavedLibraryRecord } from '../../types/editorFonts';
import type { SavedLibraryFontEntry } from '../../types/savedLibrary';

export type CatalogLibraryActionsProps = {
  libraries?: SavedLibraryRecord[];
  busy?: boolean;
  busyIndicator?: ReactNode;
  libraryEntry?: SavedLibraryFontEntry | null;
  onAddFontToLibrary?: (libraryId: string, entry: SavedLibraryFontEntry) => boolean | Promise<boolean>;
  onRequestCreateLibrary?: (entries: SavedLibraryFontEntry[]) => void;
  appearance?: CatalogAddTargetAppearance;
  stateKey?: string;
};

export function CatalogLibraryActions({
  libraries = [],
  busy = false,
  busyIndicator = null,
  libraryEntry = null,
  onAddFontToLibrary,
  onRequestCreateLibrary,
  appearance = 'default',
  stateKey = '',
}: CatalogLibraryActionsProps) {
  return (
    <CatalogAddTargetMenu
      libraries={libraries}
      busy={busy}
      busyIndicator={busyIndicator}
      appearance={appearance}
      stateKey={stateKey || libraryEntry?.id || ''}
      onAddToLibrary={(libraryId) =>
        libraryEntry && onAddFontToLibrary
          ? addLibraryEntryToLibrary({ libraryId, libraryEntry, onAddFontToLibrary })
          : false
      }
      onCreateLibrary={() =>
        libraryEntry && onRequestCreateLibrary
          ? requestCreateLibraryFromEntry({ libraryEntry, onRequestCreateLibrary })
          : false
      }
    />
  );
}
