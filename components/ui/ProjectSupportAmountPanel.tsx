import {
  buildSupportDonationUrl,
  buildSupportEmailUrlForAmount,
  getPrimaryProjectSupportLink,
  getProjectSupportEmailLink,
  getProjectSupportLinks,
  getSupportAmountPresets,
} from '../../utils/projectSupport';

function formatRub(amount: number) {
  return `${new Intl.NumberFormat('ru-RU').format(amount)} ₽`;
}

function SupportHeartIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 16.5S3.5 11.8 3.5 7.4A3.4 3.4 0 0 1 10 5.1a3.4 3.4 0 0 1 6.5 2.3c0 4.4-6.5 9.1-6.5 9.1Z" />
    </svg>
  );
}

export function ProjectSupportAmountPanel({
  onBack,
  onClose,
}: {
  onBack?: () => void;
  onClose?: () => void;
}) {
  const presets = getSupportAmountPresets();
  const primaryLink = getPrimaryProjectSupportLink();
  const extraLinks = getProjectSupportLinks().slice(primaryLink ? 1 : 0);
  const fallbackLink = getProjectSupportEmailLink();

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
    onClose?.();
  };

  return (
    <div className="px-4 py-4">
      {onBack ? (
        <button
          type="button"
          className="mb-3 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:text-gray-900"
          onClick={onBack}
        >
          <span aria-hidden>←</span>
          Назад
        </button>
      ) : null}

      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
          <SupportHeartIcon />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-tight text-gray-900">Поддержать проект</p>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
            Донат добровольный — помогает развивать DINAMIC FONT.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {presets.map((amount) => (
          <button
            key={amount}
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-semibold tabular-nums text-gray-900 transition-colors hover:border-accent hover:bg-accent hover:text-white"
            onClick={() => handleAmountClick(amount)}
          >
            {formatRub(amount)}
          </button>
        ))}
      </div>

      {primaryLink ? (
        <p className="mt-3 text-center text-[10px] leading-snug text-gray-500">
          Оплата через {primaryLink.label}. Сумму можно изменить на странице платёжного сервиса.
        </p>
      ) : (
        <p className="mt-3 text-center text-[10px] leading-snug text-gray-500">
          Ссылка на донат пока не настроена — выберите сумму, чтобы написать нам.
        </p>
      )}

      {extraLinks.length > 0 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-gray-100 pt-3">
          {extraLinks.map((link) => (
            <a
              key={`${link.label}::${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 underline-offset-2 hover:text-accent hover:underline"
              title={link.description}
              onClick={() => onClose?.()}
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t border-gray-100 pt-3 text-center">
        <a
          href={fallbackLink.url}
          className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 underline-offset-2 hover:text-accent hover:underline"
          title={fallbackLink.description}
          onClick={() => onClose?.()}
        >
          {fallbackLink.label} на {fallbackLink.url.replace('mailto:', '')}
        </a>
      </div>
    </div>
  );
}
