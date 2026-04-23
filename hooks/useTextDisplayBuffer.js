import { useEffect, useMemo, useRef } from 'react';

function createTextDisplayBuffer() {
  const buffer = {
    elements: {
      main: null,
      shadow: null,
    },
    container: null,
    switchTimer: null,
    switching: false,
    init: (containerElement) => {
      if (!containerElement) return false;

      buffer.container = containerElement;

      if (!buffer.elements.main) {
        buffer.elements.main = document.createElement('div');
        buffer.elements.main.className = 'font-display-buffer main';
        buffer.elements.main.style.transition = 'opacity 0.1s ease-in-out';
        buffer.elements.main.style.position = 'absolute';
        buffer.elements.main.style.top = '0';
        buffer.elements.main.style.left = '0';
        buffer.elements.main.style.width = '100%';
        buffer.elements.main.style.height = '100%';
        buffer.elements.main.style.zIndex = '1';
        buffer.container.appendChild(buffer.elements.main);
      }

      if (!buffer.elements.shadow) {
        buffer.elements.shadow = document.createElement('div');
        buffer.elements.shadow.className = 'font-display-buffer shadow';
        buffer.elements.shadow.style.transition = 'opacity 0.1s ease-in-out';
        buffer.elements.shadow.style.position = 'absolute';
        buffer.elements.shadow.style.top = '0';
        buffer.elements.shadow.style.left = '0';
        buffer.elements.shadow.style.width = '100%';
        buffer.elements.shadow.style.height = '100%';
        buffer.elements.shadow.style.zIndex = '0';
        buffer.elements.shadow.style.opacity = '0';
        buffer.container.appendChild(buffer.elements.shadow);
      }

      buffer.container.style.position = 'relative';
      buffer.container.style.overflow = 'hidden';

      return true;
    },
    update: (content, style) => {
      if (!buffer.elements.shadow || !buffer.elements.main) return;

      if (buffer.switchTimer) {
        buffer.elements.shadow.innerHTML = content;
        Object.assign(buffer.elements.shadow.style, style || {});
        return;
      }

      buffer.elements.shadow.innerHTML = content;
      Object.assign(buffer.elements.shadow.style, style || {});

      buffer.switchTimer = setTimeout(() => {
        buffer.switching = true;

        buffer.elements.main.style.zIndex = '0';
        buffer.elements.shadow.style.zIndex = '1';

        buffer.elements.main.style.opacity = '0';
        buffer.elements.shadow.style.opacity = '1';

        setTimeout(() => {
          buffer.elements.main.innerHTML = buffer.elements.shadow.innerHTML;
          Object.assign(buffer.elements.main.style, buffer.elements.shadow.style);

          buffer.elements.main.style.zIndex = '1';
          buffer.elements.shadow.style.zIndex = '0';

          buffer.elements.main.style.opacity = '1';
          buffer.elements.shadow.style.opacity = '0';

          buffer.switching = false;
          buffer.switchTimer = null;
        }, 100);
      }, 16.7);
    },
    cleanup: () => {
      if (buffer.switchTimer) {
        clearTimeout(buffer.switchTimer);
        buffer.switchTimer = null;
      }

      if (buffer.elements.main && buffer.elements.main.parentNode) {
        buffer.elements.main.parentNode.removeChild(buffer.elements.main);
      }

      if (buffer.elements.shadow && buffer.elements.shadow.parentNode) {
        buffer.elements.shadow.parentNode.removeChild(buffer.elements.shadow);
      }

      buffer.elements.main = null;
      buffer.elements.shadow = null;
      buffer.container = null;
    },
  };

  return buffer;
}

export function useTextDisplayBuffer({
  text,
  contentStyle,
  fontFamily,
  variationSettingsValue,
}) {
  const textContainerRef = useRef(null);
  const textDisplayBuffer = useMemo(() => createTextDisplayBuffer(), []);

  useEffect(() => {
    let initialized = false;

    if (textContainerRef.current) {
      initialized = textDisplayBuffer.init(textContainerRef.current);
    }

    return () => {
      if (initialized) {
        textDisplayBuffer.cleanup();
      }
    };
  }, [textDisplayBuffer]);

  useEffect(() => {
    if (textContainerRef.current && textDisplayBuffer.elements.main) {
      textDisplayBuffer.update(text, {
        ...contentStyle,
        fontFamily,
        fontVariationSettings: variationSettingsValue,
      });
    }
  }, [text, contentStyle, fontFamily, variationSettingsValue, textDisplayBuffer]);

  return textContainerRef;
}
