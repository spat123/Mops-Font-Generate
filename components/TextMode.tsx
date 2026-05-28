import type { CSSProperties } from 'react';
import EditableText from './EditableText';
import { useSettings } from '../contexts/SettingsContext';
import { useTextDisplayBuffer } from '../hooks/useTextDisplayBuffer';

export type TextModeProps = {
  contentStyle?: CSSProperties;
  fontFamily?: string;
  variationSettingsValue?: string;
};

function TextMode({ contentStyle, fontFamily, variationSettingsValue }: TextModeProps) {
  const { text } = useSettings();
  const textContainerRef = useTextDisplayBuffer({
    text,
    contentStyle,
    fontFamily,
    variationSettingsValue,
  });

  return (
    <div
      ref={textContainerRef}
      className="relative flex h-full min-h-full w-full flex-col pb-8 pr-8 animated-text-container"
    >
      <EditableText
        style={{
          ...contentStyle,
          position: 'relative',
          zIndex: 10,
          color: 'transparent',
          caretColor: contentStyle?.color || 'black',
        }}
        isStyles={false}
        syncId="text"
      />
    </div>
  );
}

export default TextMode;
