export type EditAssetIconProps = {
  src: string;
  className?: string;
};

/**
 * Монохромная иконка из `public/icons/edit/*.svg` (URL через editIconUrls).
 * SVG подключается как URL, цвет — через `currentColor`.
 */
export function EditAssetIcon({ src, className = '' }: EditAssetIconProps) {
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
