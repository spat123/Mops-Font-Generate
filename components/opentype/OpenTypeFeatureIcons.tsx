import type { ReactElement } from 'react';

/** SVG-иконки для OpenType-фич (не зависят от загруженного шрифта). */
const ICON_CLASS = 'h-5 w-5';

const DIGIT = {
  fontSize: 11,
  fontWeight: 500,
  fill: 'currentColor',
  stroke: 'none',
  fontFamily: 'system-ui, sans-serif',
} as const;

const SVG_BASE = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  'aria-hidden': true as const,
};

/** Тонкие линии (дробная черта, fraction slash). */
const LINE = {
  stroke: 'currentColor',
  strokeWidth: 1.15,
  strokeLinecap: 'round' as const,
};

/** Тонкие полоски ширины под цифрами (pnum / tnum). */
const BAR_HEIGHT = 1;
const BAR_Y = 14.5;

function widthBar(x: number, width: number) {
  return (
    <rect
      x={x}
      y={BAR_Y}
      width={width}
      height={BAR_HEIGHT}
      rx={0.35}
      fill="currentColor"
      opacity={0.55}
      stroke="none"
    />
  );
}

function FracIcon() {
  return (
    <svg {...SVG_BASE} className={ICON_CLASS}>
      <path {...LINE} d="M6.5 17.5L17.5 6.5" />
      <text x="7" y="10.5" {...DIGIT}>
        1
      </text>
      <text x="14" y="20" {...DIGIT}>
        2
      </text>
    </svg>
  );
}

function NumrIcon() {
  return (
    <svg {...SVG_BASE} className={ICON_CLASS}>
      <path {...LINE} d="M5 14.5h14" />
      <text x="12" y="10.5" textAnchor="middle" {...DIGIT}>
        2
      </text>
    </svg>
  );
}

function DnomIcon() {
  return (
    <svg {...SVG_BASE} className={ICON_CLASS}>
      <path {...LINE} d="M5 9.5h14" />
      <text x="12" y="20" textAnchor="middle" {...DIGIT}>
        3
      </text>
    </svg>
  );
}

function PnumIcon() {
  const cols = [
    { x: 6, digit: '1', barW: 3.5, barX: 4.25 },
    { x: 12, digit: '0', barW: 5.5, barX: 9.25 },
    { x: 18, digit: '8', barW: 7, barX: 14.5 },
  ] as const;
  return (
    <svg {...SVG_BASE} className={ICON_CLASS}>
      {cols.map(({ x, digit, barW, barX }) => (
        <g key={x}>
          <text x={x} y={12.5} textAnchor="middle" {...DIGIT}>
            {digit}
          </text>
          {widthBar(barX, barW)}
        </g>
      ))}
    </svg>
  );
}

function TnumIcon() {
  const barW = 5;
  return (
    <svg {...SVG_BASE} className={ICON_CLASS}>
      {[6, 12, 18].map((x) => (
        <g key={x}>
          <text x={x} y={12.5} textAnchor="middle" {...DIGIT}>
            1
          </text>
          {widthBar(x - barW / 2, barW)}
        </g>
      ))}
    </svg>
  );
}

/** Линейные цифры: одна высота (cap ↔ baseline), в отличие от oldstyle. */
function LnumIcon() {
  // y у <text> — baseline; верх цифр ≈ y − 0.72·fontSize. Линии — с запасом снаружи.
  const capY = 4.5;
  const baseY = 17.25;
  const digitBaselineY = 14.25;
  const cols = [
    { x: 6, digit: '0' },
    { x: 12, digit: '1' },
    { x: 18, digit: '2' },
  ] as const;
  return (
    <svg {...SVG_BASE} className={ICON_CLASS}>
      <path {...LINE} d={`M4 ${capY}h16`} opacity={0.5} />
      <path {...LINE} d={`M4 ${baseY}h16`} opacity={0.5} />
      {cols.map(({ x, digit }) => (
        <text key={x} x={x} y={digitBaselineY} textAnchor="middle" {...DIGIT}>
          {digit}
        </text>
      ))}
    </svg>
  );
}

const ICON_BY_TAG: Record<string, () => ReactElement> = {
  frac: FracIcon,
  numr: NumrIcon,
  dnom: DnomIcon,
  pnum: PnumIcon,
  tnum: TnumIcon,
  lnum: LnumIcon,
};

export function hasOpenTypeFeatureIcon(tag: string): boolean {
  const k = String(tag || '').trim().toLowerCase().slice(0, 4);
  return Boolean(k && ICON_BY_TAG[k]);
}

export function OpenTypeFeatureIcon({ tag }: { tag: string }) {
  const k = String(tag || '').trim().toLowerCase().slice(0, 4);
  const Icon = ICON_BY_TAG[k];
  if (!Icon) return null;
  return <Icon />;
}
