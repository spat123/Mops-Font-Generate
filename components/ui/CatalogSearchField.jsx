import React from 'react';
import { SearchClearButton } from './SearchClearButton';

export function CatalogSearchField({
  id,
  value,
  onChange,
  placeholder,
  count,
  countSuffix = '',
  inputInteractiveClassName = '',
  onFocusChange,
}) {
  return (
    <>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        placeholder={placeholder}
        className={`box-border h-10 w-full rounded-md border border-transparent bg-gray-50 py-0 pl-2 pr-36 text-sm leading-normal uppercase font-semibold text-gray-900 placeholder:text-gray-900/40 hover:placeholder:text-gray-900 ${inputInteractiveClassName} focus:border-black/[0.14] focus:outline-none sm:pl-3 sm:pr-44`}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="absolute right-3 top-1/2 flex max-w-[50%] -translate-y-1/2 items-center gap-1.5">
        {value ? <SearchClearButton onClick={() => onChange('')} /> : null}
        <span className="pointer-events-none truncate text-right text-sm tabular-nums uppercase font-semibold text-gray-500">
          {count}
          <span className="text-gray-400">{countSuffix}</span>
        </span>
      </div>
    </>
  );
}
