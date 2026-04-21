import React from 'react';
import { CustomSelect } from './CustomSelect';
import { customSelectTriggerClass } from './nativeSelectFieldClasses';
import { CountBadge } from './CountBadge';

export function ScopeFilterToolbar({ id, value, onChange, options, count, ariaLabel }) {
  return (
    <div className="shrink-0 pb-3">
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
        <div className="col-start-2 flex items-center justify-end md:col-start-3 lg:col-start-4 xl:col-start-5">
          <CountBadge count={count} />
        </div>
      </div>
    </div>
  );
}
