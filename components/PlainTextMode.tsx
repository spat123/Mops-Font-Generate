import type { CSSProperties } from 'react';
import EditableText from './EditableText';

export type PlainTextModeProps = {
  containerStyle?: CSSProperties;
  contentStyle?: CSSProperties;
  variant?: 'default' | 'fullscreen';
};

function PlainTextMode({ containerStyle, contentStyle, variant = 'default' }: PlainTextModeProps) {
  const isFullscreen = variant === 'fullscreen';

  return (
    <div
      className={
        isFullscreen
          ? 'relative box-border min-h-full w-full px-8 pb-8 pt-8'
          : 'relative min-h-full w-full pr-8 pb-8 pt-8'
      }
      style={containerStyle}
    >
      <EditableText style={contentStyle} isStyles={false} syncId="plain" />
    </div>
  );
}

export default PlainTextMode;
