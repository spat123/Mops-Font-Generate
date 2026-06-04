import { legalMeta } from '../config/legal';

export type ProjectSupportLink = {
  label: string;
  url: string;
  description: string;
};

function optionalSupportLink(
  defaultLabel: string,
  url: unknown,
  description: string,
  labelOverride?: unknown,
): ProjectSupportLink | null {
  const href = String(url || '').trim();
  if (!href) return null;
  const label = String(labelOverride || '').trim() || defaultLabel;
  return { label, url: href, description };
}

function parseCustomSupportLinks(): ProjectSupportLink[] {
  try {
    const raw = process.env.NEXT_PUBLIC_SUPPORT_CUSTOM_LINKS?.trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const label = String(record.label || '').trim();
        const url = String(record.url || '').trim();
        if (!label || !url) return null;
        const description = String(record.description || '').trim();
        return {
          label,
          url,
          description: description || 'Поддержать проект.',
        };
      })
      .filter((item): item is ProjectSupportLink => item != null);
  } catch {
    return [];
  }
}

export function getProjectSupportLinks(): ProjectSupportLink[] {
  const links = [
    optionalSupportLink(
      'CloudTips',
      process.env.NEXT_PUBLIC_SUPPORT_CLOUDTIPS_URL,
      'Разовая поддержка картой или СБП.',
      process.env.NEXT_PUBLIC_SUPPORT_CLOUDTIPS_LABEL,
    ),
    optionalSupportLink(
      'ЮMoney',
      process.env.NEXT_PUBLIC_SUPPORT_YOOMONEY_URL,
      'Разовый донат удобным способом.',
      process.env.NEXT_PUBLIC_SUPPORT_YOOMONEY_LABEL,
    ),
    optionalSupportLink(
      'Boosty',
      process.env.NEXT_PUBLIC_SUPPORT_BOOSTY_URL,
      'Регулярная поддержка проекта.',
      process.env.NEXT_PUBLIC_SUPPORT_BOOSTY_LABEL,
    ),
    ...parseCustomSupportLinks(),
  ].filter((item): item is ProjectSupportLink => item != null);

  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.label}::${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getProjectSupportEmailLink(): ProjectSupportLink {
  return {
    label: 'Написать',
    url: `mailto:${legalMeta.supportEmail}`,
    description: 'Если хотите поддержать проект другим способом.',
  };
}

export const SUPPORT_AMOUNT_PRESETS_RUB = [100, 300, 500, 1000] as const;

export function getSupportAmountPresets(): number[] {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_AMOUNT_PRESETS?.trim();
  if (!raw) return [...SUPPORT_AMOUNT_PRESETS_RUB];
  const parsed = raw
    .split(/[,;\s]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
  return parsed.length > 0 ? parsed : [...SUPPORT_AMOUNT_PRESETS_RUB];
}

export function buildSupportDonationUrl(baseUrl: string, amountRub: number): string {
  const base = baseUrl.trim();
  if (!base) return '';
  if (base.includes('{amount}')) {
    return base.replace(/\{amount\}/g, String(amountRub));
  }
  try {
    const url = new URL(base);
    if (url.hostname.includes('yoomoney.ru') && !url.searchParams.has('sum')) {
      url.searchParams.set('sum', String(amountRub));
    }
    return url.toString();
  } catch {
    return base;
  }
}

export function buildSupportEmailUrlForAmount(amountRub: number): string {
  const subject = encodeURIComponent(`Поддержка ${legalMeta.serviceName} — ${amountRub} ₽`);
  return `mailto:${legalMeta.supportEmail}?subject=${subject}`;
}

export function getPrimaryProjectSupportLink(): ProjectSupportLink | null {
  const links = getProjectSupportLinks();
  return links[0] ?? null;
}

export function resolveSupportDonationUrl(amountRub: number): string {
  const primaryLink = getPrimaryProjectSupportLink();
  if (primaryLink) {
    return buildSupportDonationUrl(primaryLink.url, amountRub);
  }
  return buildSupportEmailUrlForAmount(amountRub);
}

export function openSupportDonation(amountRub: number) {
  const href = resolveSupportDonationUrl(amountRub);
  if (!href) return;
  if (href.startsWith('mailto:')) {
    window.location.href = href;
  } else {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

export async function startSupportDonation(amountRub: number): Promise<void> {
  const response = await fetch('/api/support/yookassa/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountRub }),
  });

  if (response.status === 503) {
    openSupportDonation(amountRub);
    return;
  }

  const payload = (await response.json().catch(() => ({}))) as {
    confirmationUrl?: string;
    error?: string;
  };

  if (!response.ok || !payload.confirmationUrl) {
    throw new Error(payload.error || 'Не удалось создать платёж');
  }

  window.location.assign(payload.confirmationUrl);
}

export function getSupportQuickAmounts(): number[] {
  const quick = getSupportAmountPresets().slice(0, 3);
  return quick.length > 0 ? quick : [100, 300, 500];
}
