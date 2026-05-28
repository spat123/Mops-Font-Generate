import type { CSSProperties } from 'react';

/** Стили фона области превью: цвет и опционально фон-картинка (cover). */
export function getPreviewAreaBackgroundStyle(
  backgroundColor: string,
  imageDataUrl?: string | null,
): CSSProperties {
  const base: CSSProperties = { backgroundColor };
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
