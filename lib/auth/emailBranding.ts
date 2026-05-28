/** Базовый URL сайта для писем и BIMI (без слэша в конце). */
export function getEmailSiteOrigin() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://dynamicfont.ru').replace(
    /\/$/,
    '',
  );
}

/** Квадратный знак для DNS BIMI (default._bimi) — не для тела письма. */
export function getBimiLogoUrl() {
  return `${getEmailSiteOrigin()}/bimi-logo.svg`;
}

/** Полный wordmark в теле письма (PNG — совместимость с Gmail/Outlook). */
export function getEmailHeaderLogoUrl() {
  return `${getEmailSiteOrigin()}/email-logo.png`;
}

/** Обёртка HTML писем auth: логотип по центру + подвал. */
export function wrapAuthEmailHtml(bodyHtml) {
  const logoUrl = getEmailHeaderLogoUrl();
  const siteUrl = getEmailSiteOrigin();
  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#111827;line-height:1.5;max-width:480px;margin:0 auto;padding:8px 0">
  <p style="text-align:center;margin:0 0 24px">
    <img src="${logoUrl}" alt="DINAMIC FONT" width="239" height="32" style="display:inline-block;border:0;max-width:100%;height:auto" />
  </p>
  ${bodyHtml}
  <p style="font-size:12px;color:#9ca3af;margin:32px 0 0;text-align:center">
    <a href="${siteUrl}" style="color:#9ca3af;text-decoration:none">DINAMIC FONT</a>
  </p>
</div>`.trim();
}
