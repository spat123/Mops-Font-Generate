/**
 * Реквизиты оператора для /legal/terms и /legal/privacy.
 * Заполните в .env.local или здесь напрямую (ФИО самозанятого, email).
 */
export const legalMeta = {
  serviceName: 'DINAMIC FONT',
  siteUrl: 'https://dynamicfont.ru',
  operatorFullName:
    process.env.LEGAL_OPERATOR_FULL_NAME?.trim() || 'Мочалов Игорь Сергеевич',
  operatorInn: process.env.LEGAL_OPERATOR_INN?.trim() || '',
  operatorStatus:
    'самозанятый, применяющий специальный налоговый режим «Налог на профессиональный доход» (НПД)',
  supportEmail: process.env.LEGAL_SUPPORT_EMAIL?.trim() || 'support@dynamicfont.ru',
  privacyEmail: process.env.LEGAL_PRIVACY_EMAIL?.trim() || 'privacy@dynamicfont.ru',
  effectiveDate: '20 мая 2026 г.',
};

export function getOperatorLine() {
  const { operatorFullName, operatorStatus, operatorInn } = legalMeta;
  const innPart = operatorInn ? `, ИНН ${operatorInn}` : '';
  return `${operatorFullName}, ${operatorStatus}${innPart}`;
}
