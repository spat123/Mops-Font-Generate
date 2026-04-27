import React from 'react';
import { CustomSelect } from './CustomSelect';
import { customSelectTriggerClass } from './nativeSelectFieldClasses';

export function ScopeFilterToolbar({
  id,
  value,
  onChange,
  options,
  count,
  ariaLabel,
  trailing = null,
  trailingOverlay = null,
  gridClassName = '',
  selectCellClassName = '',
  trailingCellClassName = '',
}) {
  const resolvedGridClassName =
    gridClassName || 'grid max-w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  const resolvedSelectCellClassName = selectCellClassName || 'min-w-0';
  const resolvedTrailingCellClassName =
    trailingCellClassName ||
    'col-start-2 col-span-1 md:col-start-2 md:col-span-2 lg:col-start-2 lg:col-span-3 xl:col-start-2 xl:col-span-4 flex min-w-0 justify-end';

  return (
    <div className="shrink-0 pb-4">
      <div className="relative">
        <div className={resolvedGridClassName}>
          <div className={resolvedSelectCellClassName}>
            <CustomSelect
              id={id}
              value={value}
              onChange={onChange}
              className={customSelectTriggerClass()}
              aria-label={ariaLabel}
              options={options}
            />
          </div>
          <div className={resolvedTrailingCellClassName}>
            {trailing}
          </div>
        </div>
        {trailingOverlay}
      </div>
    </div>
  );
}
