export function generateVariationSettings(styleObj, supportedAxes) {
  if (!styleObj || !supportedAxes) return '';

  const settings = [];

  if (supportedAxes.wght !== undefined && styleObj.wght !== undefined) {
    settings.push(`"wght" ${styleObj.wght}`);
  }

  if (supportedAxes.ital !== undefined && styleObj.ital !== undefined) {
    settings.push(`"ital" ${styleObj.ital}`);
  }

  if (supportedAxes.slnt !== undefined && styleObj.slnt !== undefined) {
    settings.push(`"slnt" ${styleObj.slnt}`);
  }

  Object.entries(styleObj).forEach(([key, value]) => {
    if (!['wght', 'ital', 'slnt'].includes(key) && supportedAxes[key] !== undefined) {
      settings.push(`"${key}" ${value}`);
    }
  });

  return settings.join(', ');
}
