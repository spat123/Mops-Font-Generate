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
}) {
  return (
    <div className="shrink-0 pb-3">
      <div className="relative">
        <div className="grid max-w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <div className="min-w-0">
            <CustomSelect
              id={id}
              value={value}
              onChange={onChange}
              className={customSelectTriggerClass()}
              aria-label={ariaLabel}
              options={options}
            />
          </div>
          <div className="col-start-2 col-span-1 md:col-start-2 md:col-span-2 lg:col-start-2 lg:col-span-3 xl:col-start-2 xl:col-span-4 flex min-w-0 justify-end">
            {trailing}
          </div>
        </div>
        {trailingOverlay}
      </div>
    </div>
  );
}
