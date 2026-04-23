import React from 'react';
import { CatalogAddTargetMenu } from './CatalogAddTargetMenu';

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
      onAddToLibrary={async (libraryId) => {
        if (!libraryEntry) return false;
        return (await onAddFontToLibrary?.(libraryId, libraryEntry)) !== false;
      }}
      onCreateLibrary={() => {
        if (libraryEntry) {
          onRequestCreateLibrary?.([libraryEntry]);
        }
      }}
    />
  );
}
