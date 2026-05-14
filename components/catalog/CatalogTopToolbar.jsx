import React from 'react';

export function CatalogTopToolbar({
  className = '',
  trailingToolbar = null,
  trailingContainerRef = null,
  searchControl = null,
  searchActionControl = null,
  primaryFiltersControl = null,
  secondaryFiltersControl = null,
  italicControl = null,
  actionsControl = null,
  afterActionsControl = null,
  trailingContainerClassName = 'flex shrink-0 items-center',
  trailingContainerStyle = undefined,
  searchContainerClassName = 'relative min-w-0 w-full sm:flex-1',
  searchContainerStyle = undefined,
  searchActionContainerClassName = 'flex shrink-0 items-center',
  searchActionContainerStyle = undefined,
  primaryFiltersContainerClassName = 'min-w-0 w-full sm:w-auto sm:max-w-[18rem]',
  primaryFiltersContainerStyle = undefined,
  secondaryFiltersContainerClassName = 'min-w-0 w-full sm:w-auto sm:max-w-[14rem]',
  secondaryFiltersContainerStyle = undefined,
  italicContainerClassName = 'shrink-0',
  actionsContainerClassName = 'flex w-full shrink-0 flex-wrap items-center gap-4 sm:w-auto',
  afterActionsContainerClassName = 'shrink-0 sm:ml-auto',
}) {
  const rootClassName = `flex shrink-0 flex-col gap-4 ${className}`.trim();
  const hasSecondRowControls =
    primaryFiltersControl || secondaryFiltersControl || italicControl || actionsControl || afterActionsControl;

  return (
    <div className={rootClassName}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {trailingToolbar ? (
          <div ref={trailingContainerRef} className={trailingContainerClassName} style={trailingContainerStyle}>
            {trailingToolbar}
          </div>
        ) : null}
        {searchControl ? (
          <div className={searchContainerClassName} style={searchContainerStyle}>
            {searchControl}
          </div>
        ) : null}
        {searchActionControl ? (
          <div className={searchActionContainerClassName} style={searchActionContainerStyle}>
            {searchActionControl}
          </div>
        ) : null}
      </div>
      {hasSecondRowControls ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          {primaryFiltersControl ? (
            <div className={primaryFiltersContainerClassName} style={primaryFiltersContainerStyle}>
              {primaryFiltersControl}
            </div>
          ) : null}
          {secondaryFiltersControl ? (
            <div className={secondaryFiltersContainerClassName} style={secondaryFiltersContainerStyle}>
              {secondaryFiltersControl}
            </div>
          ) : null}
          {italicControl ? <div className={italicContainerClassName}>{italicControl}</div> : null}
          {actionsControl ? <div className={actionsContainerClassName}>{actionsControl}</div> : null}
          {afterActionsControl ? <div className={afterActionsContainerClassName}>{afterActionsControl}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
