/**
 * Стили фона области превью: цвет и опционально фон-картинка (cover).
 * @param {string} backgroundColor
 * @param {string|null|undefined} imageDataUrl — data URL или null
 * @returns {React.CSSProperties}
 */
export function getPreviewAreaBackgroundStyle(backgroundColor, imageDataUrl) {
  const base = { backgroundColor };
  if (imageDataUrl) {
    return {
      ...base,
      backgroundImage: `url(${imageDataUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return base;
}
