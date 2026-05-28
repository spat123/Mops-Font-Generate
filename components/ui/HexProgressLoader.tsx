import { memo, useEffect, useRef } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';

const DINAMIC_ANIMATION_URL = '/icons/anim/Dinamic.json';

type LottieJson = Record<string, unknown>;

function cloneAndRetintAnimation(source: LottieJson): LottieJson {
  const cloned = JSON.parse(JSON.stringify(source)) as LottieJson;
  const targetStroke = [0.898, 0.906, 0.922, 1];
  const ip = Number(cloned.ip) || 0;
  const fr = Math.max(1, Number(cloned.fr) || 60);
  const oneSecondOp = ip + fr;

  if (typeof cloned.op === 'number' && cloned.op > oneSecondOp) {
    cloned.op = oneSecondOp;
  }
  if (Array.isArray(cloned.layers)) {
    cloned.layers.forEach((layer) => {
      if (layer && typeof layer === 'object' && 'op' in layer) {
        const l = layer as { op?: number };
        if (typeof l.op === 'number' && l.op > oneSecondOp) {
          l.op = oneSecondOp;
        }
      }
    });
  }

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.ty === 'st' && obj.c && typeof obj.c === 'object' && obj.c !== null) {
      const c = obj.c as { k?: number[] };
      if (Array.isArray(c.k) && c.k.length >= 3) {
        const [r, g, b] = c.k;
        const isNearWhite = r > 0.98 && g > 0.98 && b > 0.98;
        if (isNearWhite) {
          c.k = targetStroke;
        }
      }
    }
    Object.values(obj).forEach(walk);
  };

  walk(cloned);
  return cloned;
}

let loaderAnimationDataPromise: Promise<LottieJson> | null = null;

function loadLoaderAnimationData() {
  if (!loaderAnimationDataPromise) {
    loaderAnimationDataPromise = fetch(DINAMIC_ANIMATION_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${DINAMIC_ANIMATION_URL}`);
        return res.json() as Promise<LottieJson>;
      })
      .then(cloneAndRetintAnimation);
  }
  return loaderAnimationDataPromise;
}

export type HexProgressLoaderProps = {
  size?: number;
  className?: string;
};

export const HexProgressLoader = memo(function HexProgressLoader({
  size = 80,
  className = '',
}: HexProgressLoaderProps) {
  const px = Math.max(24, Number(size) || 80);
  const h = Math.round((px * 427) / 485);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let anim: AnimationItem | null = null;

    const mount = async () => {
      if (!containerRef.current) return;
      try {
        const animationData = await loadLoaderAnimationData();
        if (destroyed || !containerRef.current) return;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        });
        anim.play();
      } catch {
        // fallback не нужен
      }
    };

    mount();

    return () => {
      destroyed = true;
      anim?.destroy();
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
