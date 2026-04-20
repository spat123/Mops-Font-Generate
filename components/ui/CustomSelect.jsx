import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * Кастомный выпадающий список (listbox): серый фон, акцент при наведении, разделители.
 * Рендер списка в document.body (fixed), чтобы не резался overflow у сайдбара/панелей.
 */
export const CustomSelect = forwardRef(function CustomSelect(
  {
    id,
    className = '',
    value,
    onChange,
    options = [],
    /** Текст на триггере при `value === emptyValue` (пункт в список не входит) */
    placeholder,
    /** Значение «фильтр не задан»; по умолчанию только для placeholder */
    emptyValue = '',
    disabled = false,
    'aria-label': ariaLabel,
    listZIndexClass = 'z-[300]',
  },
  ref,
) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => setMounted(true), []);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)),
    [options, value],
  );

  const displayLabel = useMemo(() => {
    if (selected) return selected.label;
    if (
      placeholder != null &&
      placeholder !== '' &&
      String(value) === String(emptyValue)
    ) {
      return placeholder;
    }
    return String(value ?? '');
  }, [selected, value, placeholder, emptyValue]);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useLayoutEffect(() => {
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const t = e.target;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handlePick = (v) => {
    onChange(String(v));
    setOpen(false);
  };

  const listNode =
    open &&
    mounted &&
    typeof document !== 'undefined' &&
    options.length > 0 ? (
      createPortal(
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className={`fixed max-h-64 min-w-0 overflow-y-auto rounded-md bg-white shadow-md outline-none ${listZIndexClass}`}
          style={{
            top: pos.top,
            left: pos.left,
            width: Math.max(pos.width, 120),
          }}
        >
          {options.map((opt, i) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li
                key={`${opt.value}-${i}`}
                role="option"
                aria-selected={isSelected}
                style={opt.style}
                className={[
                  'break-words cursor-pointer border-b border-gray-200 p-3 text-left text-sm font-semibold uppercase text-gray-900 transition-colors last:border-b-0',
                  'hover:bg-accent hover:text-white',
                  isSelected ? 'bg-accent text-white' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePick(opt.value);
                }}
              >
                {opt.label}
              </li>
            );
          })}
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
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="min-w-0 flex-1 truncate" style={selected?.style}>
          {displayLabel}
        </span>
      </button>
      <span
        className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-center text-gray-900 transition-colors group-hover:text-white peer-disabled:text-gray-600 peer-disabled:group-hover:text-gray-600"
        aria-hidden
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      {listNode}
    </div>
  );
});
