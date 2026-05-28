const STANDARD_AXIS_SUFFIX: Array<{
  key: string;
  defaultValue: number;
  format: (value: number) => string;
}> = [
  { key: 'wght', defaultValue: 400, format: (v) => `_w${Math.round(v)}` },
  { key: 'wdth', defaultValue: 100, format: (v) => `_wd${Math.round(v)}` },
  { key: 'slnt', defaultValue: 0, format: (v) => `_sl${Math.round(Math.abs(v))}` },
  { key: 'opsz', defaultValue: 14, format: (v) => `_opsz${Math.round(v)}` },
  { key: 'GRAD', defaultValue: 0, format: (v) => `_grad${Math.round(v)}` },
];

const PARAMETRIC_AXIS_KEYS = ['XOPQ', 'YOPQ', 'XTRA', 'YTUC', 'YTLC', 'YTAS', 'YTDE', 'YTFI'] as const;

/** Суффикс имени файла статики из VF (wght, wdth, parametric axes, …). */
export function buildVariableSettingsFilenameSuffix(
  variableSettings: Record<string, number> | null | undefined,
  { maxLength = 50 }: { maxLength?: number } = {},
): string {
  if (!variableSettings || typeof variableSettings !== 'object') return '';

  let axisInfo = '';
  for (const { key, defaultValue, format } of STANDARD_AXIS_SUFFIX) {
    const raw = variableSettings[key];
    if (raw != null && raw !== defaultValue) {
      axisInfo += format(Number(raw));
    }
  }

  for (const axis of PARAMETRIC_AXIS_KEYS) {
    if (variableSettings[axis] !== undefined) {
      axisInfo += `_${axis.toLowerCase()}${Math.round(variableSettings[axis])}`;
    }
  }

  if (axisInfo.length > maxLength) {
    return axisInfo.substring(0, maxLength - 3) + '...';
  }
  return axisInfo;
}
