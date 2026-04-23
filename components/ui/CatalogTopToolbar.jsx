import React from 'react';

export function CatalogTopToolbar({
  trailingToolbar = null,
  searchSlot = null,
  filtersSlot = null,
  italicSlot = null,
  actionsSlot = null,
}) {
  return (
    <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      {trailingToolbar}
      {searchSlot}
      {filtersSlot}
      {italicSlot}
      {actionsSlot}
    </div>
  );
}
