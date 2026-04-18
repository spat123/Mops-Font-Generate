/** Строка variation для fontObj (как в processLocalFont). */
export function buildVariationSettingsCssString(variableAxes) {
  if (!variableAxes || typeof variableAxes !== 'object') return '';
  return Object.entries(variableAxes)
    .map(([tag, v]) => {
      const d = v?.default;
      const num = typeof d === 'number' && Number.isFinite(d) ? d : 0;
      return `\"${tag}\" ${num}`;
    })
    .join(', ');
}
