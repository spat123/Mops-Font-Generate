import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { PopupDialogHeader } from '../ui/PopupDialogHeader';
import { AppButton } from '../ui/AppButton';
import { formatRecoveryDeadlineRu } from '../../lib/auth/accountDeletion';

function ModalShell({
  open,
  title,
  onClose,
  children,
  closeLabel = 'Закрыть',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
}) {
  const panelRef = useRef(null);

  useDismissibleLayer({
    open,
    refs: [panelRef],
    onDismiss: onClose,
  });

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center bg-black/30 px-4 py-8"
      role="dialog"
      aria-modal="true"
    >
      <div ref={panelRef} className="w-full max-w-md overflow-hidden bg-white shadow-xl">
        <PopupDialogHeader title={title} onClose={onClose} titleClassName="!text-base" />
        <div className="px-6 pb-6 pt-2 text-center text-sm leading-relaxed text-gray-600">{children}</div>
        <div className="border-t border-gray-100 px-6 py-4">
          <AppButton type="button" variant="accent" size="md" className="w-full" onClick={onClose}>
            {closeLabel}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AccountDeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <ModalShell open={open} title="Удалить аккаунт?" onClose={onClose} closeLabel="Отмена">
      <p>
        Аккаунт будет отключён, но <strong className="font-medium text-gray-900">не удалится из базы</strong> сразу.
        В течение <strong className="font-medium text-gray-900">6 месяцев</strong> его можно восстановить при регистрации на
        тот же email с тем же паролем.
      </p>
      <div className="mt-5">
        <AppButton
          type="button"
          variant="outline"
          size="md"
          className="w-full !border-accent !text-accent hover:!bg-accent hover:!text-white"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Удаление…' : 'Удалить аккаунт'}
        </AppButton>
      </div>
    </ModalShell>
  );
}

export function AccountDeletedSuccessModal({
  open,
  onClose,
  recoverableUntil,
}: {
  open: boolean;
  onClose: () => void;
  recoverableUntil?: string | null;
}) {
  const untilText = formatRecoveryDeadlineRu(recoverableUntil);

  return (
    <ModalShell open={open} title="Аккаунт удалён" onClose={onClose} closeLabel="Понятно">
      <p>
        Вы вышли из аккаунта. Данные сохранены ещё <strong className="font-medium text-gray-900">6 месяцев</strong>
        {untilText ? (
          <>
            {' '}
            (до <strong className="font-medium text-gray-900">{untilText}</strong>)
          </>
        ) : null}
        .
      </p>
      <p className="mt-4">
        Чтобы восстановить доступ, зарегистрируйтесь снова на тот же email и нажмите{' '}
        <strong className="font-medium text-gray-900">«Восстановить аккаунт»</strong> — нужен тот же пароль, что при
        удалении.
      </p>
    </ModalShell>
  );
}
