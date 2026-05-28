import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect';
import { createPortal } from 'react-dom';
import { CatalogCheckboxMark } from '../catalog/CatalogCheckbox';
import { SearchClearButton } from './SearchClearButton';
import { useDismissibleLayer } from './useDismissibleLayer';
import { SelectChevronIcon } from './SelectChevronIcon';

export type CustomSelectOption = {
  value?: string;
  label?: string;
  triggerLabel?: string;
  searchText?: string;
  rightLabel?: string | number;
  disabled?: boolean;
  style?: CSSProperties;
  kind?: 'section';
  key?: string;
};

export type CustomSelectProps = {
  id?: string;
  className?: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options?: CustomSelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  placeholder?: string;
  emptyValue?: string;
  disabled?: boolean;
  clearable?: boolean;
  clearAriaLabel?: string;
  'aria-label'?: string;
  listZIndexClass?: string;
  listMinWidthPx?: number;
};

/**
 * Кастомный выпадающий список (listbox): серый фон, акцент при наведении, разделители.
 */
export const CustomSelect = forwardRef<HTMLButtonElement, CustomSelectProps>(function CustomSelect(
  {
    id,
    className = '',
    value,
    onChange,
    options = [],
    multiple = false,
    searchable = false,
    searchPlaceholder = 'Поиск…',
    placeholder,
    emptyValue = '',
    disabled = false,
    clearable = false,
    clearAriaLabel = 'Очистить фильтр',
    'aria-label': ariaLabel,
    listZIndexClass = 'z-[300]',
    listMinWidthPx = 120,
  },
  ref,
) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => setMounted(true), []);

  const selectedValues = useMemo(() => {
    if (!multiple) return [];
    return Array.isArray(value)
      ? value.map((item) => String(item))
      : value == null || value === ''
        ? []
        : [String(value)];
  }, [multiple, value]);

  const selectableOptions = useMemo(
    () => options.filter((option) => !option?.kind && option?.value != null),
    [options],
  );

  const selected = useMemo(() => {
    if (multiple) return null;
    return selectableOptions.find((o) => String(o.value) === String(value));
  }, [multiple, selectableOptions, value]);

  const selectedOptions = useMemo(() => {
    if (!multiple) return selected ? [selected] : [];
    const selectedSet = new Set(selectedValues);
    return selectableOptions.filter((option) => selectedSet.has(String(option.value)));
  }, [multiple, selectableOptions, selected, selectedValues]);

  const displayLabel = useMemo(() => {
    if (multiple) {
      if (selectedOptions.length > 0) {
        return selectedOptions
          .map((option) => option.triggerLabel ?? option.label)
          .filter(Boolean)
          .join(', ');
      }
      if (placeholder != null && placeholder !== '') return placeholder;
      return '';
    }
    if (selected) return selected.triggerLabel ?? selected.label;
    if (
      placeholder != null &&
      placeholder !== '' &&
      String(value) === String(emptyValue)
    ) {
      return placeholder;
    }
    return String(value ?? '');
  }, [multiple, selectedOptions, placeholder, selected, value, emptyValue]);

  const hasValue = multiple
    ? selectedValues.length > 0
    : String(value ?? '') !== String(emptyValue);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    updatePos();
    const onWin = () => updatePos();
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
    };
  }, [open, updatePos]);

  useDismissibleLayer({
    open,
    refs: [rootRef, listRef],
    onDismiss: () => setOpen(false),
  });

  useEffect(() => {
    if (!open && searchQuery) {
      setSearchQuery('');
    }
  }, [open, searchQuery]);

  useEffect(() => {
    if (!open || !searchable) return;
    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open, searchable]);

  const handlePick = useCallback(
    (nextValue: string | number) => {
      if (multiple) {
        const normalized = String(nextValue);
        const nextSelected = selectedValues.includes(normalized)
          ? selectedValues.filter((item) => item !== normalized)
          : [...selectedValues, normalized];
        onChange(nextSelected);
        return;
      }
      onChange(String(nextValue));
      setOpen(false);
    },
    [multiple, onChange, selectedValues],
  );

  const handleClear = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onChange(multiple ? [] : String(emptyValue));
      setOpen(false);
    },
    [emptyValue, multiple, onChange],
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const needle = searchQuery.trim().toLocaleLowerCase('ru');
    const matches = (opt: CustomSelectOption) => {
      const haystack = [opt.label, opt.triggerLabel, opt.searchText, opt.value]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('ru');
      return haystack.includes(needle);
    };

    const hasSections = options.some((opt) => opt?.kind === 'section');
    if (!hasSections) return options.filter(matches);

    const grouped: CustomSelectOption[] = [];
    let currentSection: CustomSelectOption | null = null;
    let currentItems: CustomSelectOption[] = [];

    const flushSection = () => {
      if (currentSection && currentItems.length > 0) {
        grouped.push(currentSection, ...currentItems);
      }
    };

    options.forEach((opt) => {
      if (opt?.kind === 'section') {
        flushSection();
        currentSection = opt;
        currentItems = [];
        return;
      }
      if (matches(opt)) currentItems.push(opt);
    });

    flushSection();
    return grouped;
  }, [options, searchQuery, searchable]);

  const listNode =
    open &&
    mounted &&
    typeof document !== 'undefined' ? (
      createPortal(
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable={multiple || undefined}
          className={`fixed max-h-84 min-w-0 overflow-y-auto rounded-md bg-white shadow-md outline-none ${listZIndexClass}`}
          style={{
            top: pos.top,
            left: pos.left,
            width: Math.max(pos.width, Number(listMinWidthPx) || 120),
          }}
        >
          {options.length === 0 ? (
            <li className="border-b-0 p-3 text-sm font-semibold uppercase text-gray-500">Нет вариантов</li>
          ) : (
            <>
          {searchable ? (
            <li className="sticky top-0 z-10 border-b border-gray-200 bg-white p-2">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 pr-9 text-sm font-semibold uppercase text-gray-900 outline-none transition-colors placeholder:text-gray-900/45 focus:border-black/[0.14]"
                />
                {searchQuery ? (
                  <div className="absolute inset-y-0 right-1 flex items-center">
                    <SearchClearButton
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setSearchQuery('');
                      }}
                      ariaLabel="Очистить поиск"
                      className="relative z-10"
                    />
                  </div>
                ) : null}
              </div>
            </li>
          ) : null}
          {filteredOptions.map((opt, i) => {
            if (opt?.kind === 'section') {
              return (
                <li
                  key={`${opt.key || opt.label || 'section'}-${i}`}
                  className={`sticky ${
                    searchable ? 'top-[3.25rem]' : 'top-0'
                  } z-[5] border-b border-gray-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500`}
                >
                  {opt.label}
                </li>
              );
            }
            const isSelected = multiple
              ? selectedValues.includes(String(opt.value))
              : String(opt.value) === String(value);
            const isOptionDisabled = Boolean(opt.disabled);
            return (
              <li
                key={`${opt.value}-${i}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isOptionDisabled || undefined}
                style={opt.style}
                className={[
                  'group break-words border-b border-gray-200 p-3 text-left text-sm font-semibold uppercase text-gray-900 transition-colors last:border-b-0',
                  isOptionDisabled
                    ? 'cursor-not-allowed opacity-45'
                    : 'cursor-pointer hover:bg-accent hover:text-white',
                  isSelected && !isOptionDisabled ? 'bg-accent text-white' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (isOptionDisabled) return;
                  handlePick(opt.value);
                }}
              >
                <div className="flex items-center gap-2">
                  {multiple ? (
                    <CatalogCheckboxMark checked={isSelected} inverted={isSelected} />
                  ) : null}
                  <span className="min-w-0 flex-1 break-words">{opt.label}</span>
                  {opt?.rightLabel ? (
                    <span className="shrink-0 tabular-nums opacity-80">{String(opt.rightLabel)}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
          {filteredOptions.every((opt) => opt?.kind === 'section') ? (
            <li className="border-b-0 p-3 text-sm font-semibold uppercase text-gray-500">
              Ничего не найдено
            </li>
          ) : null}
            </>
          )}
        </ul>,
        document.body,
      )
    ) : null;

  return (
    <div ref={rootRef} className="group relative min-w-0 w-full">
      <button
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (!disabled) {
            if (!open) updatePos();
            setOpen((o) => !o);
          }
        }}
        className={[
          'peer flex w-full items-center text-left rounded-md',
          clearable && hasValue ? 'pr-16' : '',
          disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className="min-w-0 flex-1 truncate"
          style={!multiple && selected ? selected.style : undefined}
        >
          {displayLabel}
        </span>
      </button>
      {clearable && hasValue && !disabled ? (
        <div className="absolute inset-y-0 right-8 flex items-center">
          <SearchClearButton
            onClick={handleClear}
            ariaLabel={clearAriaLabel}
            className="relative z-10"
          />
        </div>
      ) : null}
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-gray-400 transition-colors group-hover:text-gray-800 peer-disabled:text-gray-600 peer-disabled:group-hover:text-gray-600"
        aria-hidden
      >
        <SelectChevronIcon open={open} />
      </span>
      {listNode}
    </div>
  );
});
