import React, { useEffect, useRef } from 'react';
import dynamicAnimationData from '../../assets/icon/Anim/Dinamic.json';

/**
 * @typedef {import('lottie-web').AnimationItem & { __mopsCompleteHandler?: () => void }} MopsAnimationItem
 */

function cloneAndRetintAnimation(source) {
  const cloned = JSON.parse(JSON.stringify(source));
  const targetStroke = [0.898, 0.906, 0.922, 1]; // #E5E7EB
  const ip = Number(cloned.ip) || 0;
  const fr = Math.max(1, Number(cloned.fr) || 60);
  const oneSecondOp = ip + fr;

  // Укорачиваем сам таймлайн до 1 секунды (без ускорения playback rate).
  if (typeof cloned.op === 'number' && cloned.op > oneSecondOp) {
    cloned.op = oneSecondOp;
  }
  if (Array.isArray(cloned.layers)) {
    cloned.layers.forEach((layer) => {
      if (layer && typeof layer.op === 'number' && layer.op > oneSecondOp) {
        layer.op = oneSecondOp;
      }
    });
  }

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.ty === 'st' && node.c && Array.isArray(node.c.k) && node.c.k.length >= 3) {
      const [r, g, b] = node.c.k;
      const isNearWhite = r > 0.98 && g > 0.98 && b > 0.98;
      if (isNearWhite) {
        node.c.k = targetStroke;
      }
    }
    Object.values(node).forEach(walk);
  };

  walk(cloned);
  return cloned;
}

const loaderAnimationData = cloneAndRetintAnimation(dynamicAnimationData);

export const HexProgressLoader = React.memo(function HexProgressLoader({
  size = 80,
  className = '',
}) {
  const px = Math.max(24, Number(size) || 80);
  const h = Math.round((px * 427) / 485);
  const containerRef = useRef(null);

  useEffect(() => {
    let destroyed = false;
    /** @type {MopsAnimationItem | null} */
    let anim = null;

    const mount = async () => {
      if (!containerRef.current) return;
      try {
        const lottieModule = await import('lottie-web');
        if (destroyed || !containerRef.current) return;
        const lottie = lottieModule?.default || lottieModule;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: loaderAnimationData,
        });
        anim.play();
      } catch {
        // no-op: fallback не нужен, просто не рендерим анимацию
      }
    };

    mount();

    return () => {
      destroyed = true;
      if (anim) {
        anim.destroy();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      role="status"
      aria-label="Загрузка"
      style={{
        width: px,
        height: h,
      }}
    />
  );
});
