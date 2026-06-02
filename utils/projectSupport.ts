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
