import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { AppButton } from './AppButton';
import { PopupDialogHeader } from './PopupDialogHeader';
import { useDismissibleLayer } from './useDismissibleLayer';
import { toast } from '../../utils/appNotify';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_HINT = 'До 5 МБ: скриншот, видео или файл с примером.';

type BugReportDialogProps = {
  open: boolean;
  onClose: () => void;
};

type AttachmentPayload = {
  name: string;
  type: string;
  size: number;
  contentBase64: string;
};

function readFileAsAttachment(file: File): Promise<AttachmentPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('file_read_failed'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const contentBase64 = dataUrl.includes(',') ? dataUrl.split(',').pop() || '' : dataUrl;
      resolve({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        contentBase64,
      });
    };
    reader.readAsDataURL(file);
  });
}

export function BugReportDialog({ open, onClose }: BugReportDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(
    () => subject.trim().length >= 3 && message.trim().length >= 10 && !busy,
    [busy, message, subject],
  );

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

  useEffect(() => {
    if (open) return;
    setBusy(false);
  }, [open]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (nextFile.size > MAX_ATTACHMENT_BYTES) {
      toast.info('Файл слишком большой. Максимум 5 МБ.');
      event.target.value = '';
      setFile(null);
      return;
    }
    setFile(nextFile);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.info('Заполните тему и описание проблемы.');
      return;
    }
    setBusy(true);
    try {
      const attachment = file ? await readFileAsAttachment(file) : null;
      const response = await fetch('/api/feedback/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          attachment,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'send_failed');
      }
      toast.success('Спасибо! Сообщение отправлено.');
      setSubject('');
      setMessage('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onClose();
    } catch {
      toast.error('Не удалось отправить сообщение. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[520] flex items-center justify-center bg-black/30 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bug-report-title"
    >
      <div
        ref={panelRef}
        className="flex max-h-[min(90vh,680px)] w-full max-w-lg flex-col overflow-hidden bg-white shadow-xl"
      >
        <PopupDialogHeader
          title="Сообщить об ошибке"
          onClose={onClose}
          titleClassName="!text-lg"
          closeAriaLabel="Закрыть форму сообщения об ошибке"
        />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">Тема</span>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Например: не добавляется шрифт в библиотеку"
              className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              maxLength={140}
              disabled={busy}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
              Опишите проблему
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Что произошло, что ожидали увидеть, какие шаги привели к ошибке?"
              className="mt-2 min-h-36 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              maxLength={4000}
              disabled={busy}
            />
          </label>

          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                  Прикрепить файл
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {file ? `${file.name} · ${Math.ceil(file.size / 1024)} КБ` : ATTACHMENT_HINT}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {file ? (
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase text-gray-500 transition-colors hover:text-gray-900"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={busy}
                  >
                    Убрать
                  </button>
                ) : null}
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  className="!min-h-8"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Выбрать
                </AppButton>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,video/*,.txt,.pdf,.json,.zip"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-stretch gap-3 border-t border-gray-200 bg-white px-5 py-4">
          <AppButton type="button" variant="outline" fullWidth className="!min-h-9" onClick={onClose} disabled={busy}>
            Отменить
          </AppButton>
          <AppButton
            type="button"
            variant="accent"
            fullWidth
            className="!min-h-9"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {busy ? 'Отправка…' : 'Отправить'}
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
