import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getPrimaryProjectSupportLink,
  getProjectSupportEmailLink,
  getProjectSupportLinks,
  getSupportQuickAmounts,
  openSupportDonation,
} from '../../utils/projectSupport';
import { EditAssetIcon } from './EditAssetIcon';
import { heartIconUrl } from './editIconUrls';
import { PopupDialogHeader } from './PopupDialogHeader';
import { useDismissibleLayer } from './useDismissibleLayer';

function formatRubLabel(amount: number) {
  return `${new Intl.NumberFormat('ru-RU').format(amount)} руб.`;
}

export type ProjectSupportDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ProjectSupportDialog({ open, onClose }: ProjectSupportDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const quickAmounts = useMemo(() => getSupportQuickAmounts(), []);
  const [selection, setSelection] = useState<number | 'custom'>(() => quickAmounts[0] ?? 100);
  const [customAmount, setCustomAmount] = useState('');
  const primaryLink = getPrimaryProjectSupportLink();
  const extraLinks = getProjectSupportLinks().slice(primaryLink ? 1 : 0);
  const fallbackLink = getProjectSupportEmailLink();
  const resolvedAmount =
    selection === 'custom' ? Number.parseInt(customAmount.replace(/\s/g, ''), 10) : selection;
  const canDonate = Number.isFinite(resolvedAmount) && resolvedAmount > 0;

  useDismissibleLayer({
    open,
    refs: [panelRef],
    onDismiss: onClose,
  });

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, open]);

  const handleDonate = () => {
    if (!canDonate) return;
    openSupportDonation(resolvedAmount);
    onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center bg-black/30 px-4 py-8"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Поддержать проект"
        className="flex w-full max-w-md flex-col overflow-hidden bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <PopupDialogHeader
          title="Поддержать проект"
          onClose={onClose}
          titleClassName="!text-lg"
          closeAriaLabel="Закрыть окно поддержки проекта"
        />

        <div className="px-6 py-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <EditAssetIcon src={heartIconUrl} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-tight text-gray-900">
                Помогите развивать DINAMIC FONT
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                Открытая бета остаётся бесплатной. Донат добровольный — выберите сумму, если хотите поддержать
                разработку.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickAmounts.map((amount) => {
              const selected = selection === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  aria-pressed={selected}
                  className={`inline-flex h-11 items-center justify-center rounded-xl border bg-white px-2 text-[11px] font-semibold uppercase tracking-tight transition-colors sm:text-xs ${
                    selected
                      ? 'border-accent text-accent'
                      : 'border-gray-200 text-gray-900 hover:border-gray-400'
                  }`}
                  onClick={() => setSelection(amount)}
                >
                  {formatRubLabel(amount)}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={selection === 'custom'}
              className={`inline-flex h-11 items-center justify-center rounded-xl border bg-white px-2 text-[11px] font-semibold uppercase tracking-tight transition-colors sm:text-xs ${
                selection === 'custom'
                  ? 'border-accent text-accent'
                  : 'border-gray-200 text-gray-900 hover:border-gray-400'
              }`}
              onClick={() => setSelection('custom')}
            >
              Иная сумма
            </button>
          </div>

          {selection === 'custom' ? (
            <label className="mt-3 block">
              <span className="sr-only">Сумма доната в рублях</span>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder="Укажите сумму, ₽"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
          ) : null}

          <button
            type="button"
            disabled={!canDonate}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent bg-accent text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-accent-hover hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleDonate}
          >
            <EditAssetIcon src={heartIconUrl} className="h-4 w-4" />
            Поддержать проект
          </button>

          {primaryLink ? (
            <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
              Оплата через {primaryLink.label}. Сумму можно изменить на странице платёжного сервиса.
            </p>
          ) : (
            <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
              Ссылка на донат пока не настроена — выберите сумму, чтобы написать нам.
            </p>
          )}

          {extraLinks.length > 0 ? (
            <div className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-2 border-t border-gray-100 pt-5">
              {extraLinks.map((link) => (
                <a
                  key={`${link.label}::${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold uppercase tracking-wide text-gray-600 underline-offset-2 transition-colors hover:text-accent hover:underline"
                  title={link.description}
                  onClick={onClose}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}

          <div className={`${extraLinks.length > 0 ? 'mt-3' : 'mt-5 border-t border-gray-100 pt-5'} text-center`}>
            <a
              href={fallbackLink.url}
              className="text-xs font-semibold uppercase tracking-wide text-gray-600 underline-offset-2 transition-colors hover:text-accent hover:underline"
              title={fallbackLink.description}
              onClick={onClose}
            >
              {fallbackLink.label} на {fallbackLink.url.replace('mailto:', '')}
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
