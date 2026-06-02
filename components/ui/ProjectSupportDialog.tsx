import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  buildSupportDonationUrl,
  buildSupportEmailUrlForAmount,
  getPrimaryProjectSupportLink,
  getProjectSupportEmailLink,
  getProjectSupportLinks,
  getSupportAmountPresets,
} from '../../utils/projectSupport';
import { AppButton } from './AppButton';
import { EditAssetIcon } from './EditAssetIcon';
import { heartIconUrl } from './editIconUrls';
import { PopupDialogHeader } from './PopupDialogHeader';
import { useDismissibleLayer } from './useDismissibleLayer';

function formatRub(amount: number) {
  return `${new Intl.NumberFormat('ru-RU').format(amount)} ₽`;
}

export type ProjectSupportDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ProjectSupportDialog({ open, onClose }: ProjectSupportDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const presets = getSupportAmountPresets();
  const primaryLink = getPrimaryProjectSupportLink();
  const extraLinks = getProjectSupportLinks().slice(primaryLink ? 1 : 0);
  const fallbackLink = getProjectSupportEmailLink();

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

  const resolveAmountUrl = (amountRub: number) => {
    if (primaryLink) {
      return buildSupportDonationUrl(primaryLink.url, amountRub);
    }
    return buildSupportEmailUrlForAmount(amountRub);
  };

  const handleAmountClick = (amountRub: number) => {
    const href = resolveAmountUrl(amountRub);
    if (!href) return;
    if (href.startsWith('mailto:')) {
      window.location.href = href;
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
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

          <div className="mt-6 grid grid-cols-2 gap-3">
            {presets.map((amount) => (
              <AppButton
                key={amount}
                type="button"
                variant="outline"
                size="md"
                fullWidth
                className="!h-12 !text-base !font-semibold !tabular-nums hover:!border-accent hover:!bg-accent hover:!text-white"
                onClick={() => handleAmountClick(amount)}
              >
                {formatRub(amount)}
              </AppButton>
            ))}
          </div>

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
