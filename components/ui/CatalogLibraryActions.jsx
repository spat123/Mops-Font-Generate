import React from 'react';
import { CatalogAddTargetMenu } from './CatalogAddTargetMenu';

export function CatalogLibraryActions({
  libraries = [],
  busy = false,
  busyIndicator = null,
  libraryEntry = null,
  onAddToSession,
  onAddFontToLibrary,
  onRequestCreateLibrary,
}) {
  return (
    <CatalogAddTargetMenu
      libraries={libraries}
      busy={busy}
      busyIndicator={busyIndicator}
      onAddToSession={onAddToSession}
      onAddToLibrary={async (libraryId) => {
        const ok = await onAddToSession?.();
        if (ok && libraryEntry) {
          onAddFontToLibrary?.(libraryId, libraryEntry);
        }
      }}
      onCreateLibrary={() => {
        if (libraryEntry) {
          onRequestCreateLibrary?.([libraryEntry]);
        }
      }}
    />
  );
}
