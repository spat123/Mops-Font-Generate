/** CustomSelect может отдавать string | string[] — берём первое скалярное значение. */
export function pickSelectValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? '' : value;
}
