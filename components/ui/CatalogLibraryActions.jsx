import React from 'react';
import { CatalogAddTargetMenu } from './CatalogAddTargetMenu';
import {
  addLibraryEntryToLibrary,
  requestCreateLibraryFromEntry,
} from '../../utils/libraryEntryActions';

export function CatalogLibraryActions({
  libraries = [],
  busy = false,
  busyIndicator = null,
  libraryEntry = null,
  onAddFontToLibrary,
  onRequestCreateLibrary,
  appearance = 'default',
  stateKey = '',
}) {
  return (
    <CatalogAddTargetMenu
      libraries={libraries}
      busy={busy}
      busyIndicator={busyIndicator}
      appearance={appearance}
      stateKey={stateKey || libraryEntry?.id || ''}
      onAddToLibrary={(libraryId) =>
        addLibraryEntryToLibrary({ libraryId, libraryEntry, onAddFontToLibrary })
      }
      onCreateLibrary={() =>
        requestCreateLibraryFromEntry({ libraryEntry, onRequestCreateLibrary })
      }
    />
  );
}
