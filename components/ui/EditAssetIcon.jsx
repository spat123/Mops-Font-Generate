import React from 'react';

/**
 * Монохромная иконка из `assets/icon/edit/*.svg`.
 * SVG подключается как URL (asset/resource), цвет управляется через `currentColor`.
 */
export function EditAssetIcon({ src, className = '' }) {
  return (
    <span
      className={`inline-block shrink-0 bg-current ${className}`.trim()}
      style={{
        WebkitMaskImage: `url(${src})`,
        WebkitMaskSize: 'contain',
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        maskImage: `url(${src})`,
        maskSize: 'contain',
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
      }}
      aria-hidden
    />
  );
}

