import { ImageResponse } from 'next/og';
import { resolveShareFromQuery } from '../../../lib/share/resolveShareFromQuery';
import { getShareOgDisplayData, SHARE_OG_HEIGHT, SHARE_OG_WIDTH } from '../../../utils/libraryShareOg';
import { loadShareOgImageAssets } from '../../../utils/ogImageAssets';

export const config = {
  runtime: 'edge',
};

const MAX_BADGES = 9;

async function loadInterSemiBold() {
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.2.5/files/inter-cyrillic-600-normal.woff',
  );
  if (!res.ok) throw new Error('font load failed');
  return res.arrayBuffer();
}

function badgeLabel(name: string | null, overflow: number) {
  if (overflow > 0) return 'И ДРУГИЕ';
  return String(name || '').slice(0, 36);
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const { payload } = await resolveShareFromQuery({
    id: url.searchParams.get('id') || '',
    share: url.searchParams.get('share') || '',
  });
  if (!payload) {
    return Response.redirect(`${origin}/og.png`, 302);
  }
  const data = getShareOgDisplayData(payload);

  const visibleFonts = data.fontNames.slice(0, MAX_BADGES);
  const overflow = Math.max(0, data.fontNames.length - visibleFonts.length);
  const badges: Array<string | null> = overflow > 0 ? [...visibleFonts, null] : visibleFonts;

  let fontData: ArrayBuffer;
  let logoDataUrl: string | null;
  let backgroundDataUrl: string | null;
  try {
    [fontData, { logoDataUrl, backgroundDataUrl }] = await Promise.all([
      loadInterSemiBold(),
      loadShareOgImageAssets(origin),
    ]);
  } catch (e) {
    console.error('[og/share] assets', e);
    return new Response('Asset load error', { status: 500 });
  }

  const rightWidth = SHARE_OG_WIDTH / 2;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          flexDirection: 'row',
          fontFamily: 'Inter',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '50%',
            height: '100%',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            padding: '48px 40px',
            justifyContent: 'space-between',
          }}
        >
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt=""
              width={220}
              height={30}
              style={{ objectFit: 'contain', objectPosition: 'left center' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                fontWeight: 600,
                color: '#111827',
                letterSpacing: '0.06em',
              }}
            >
              DINAMIC FONT
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 22,
                fontWeight: 600,
                color: '#9ca3af',
                lineHeight: 1.35,
                letterSpacing: '0.02em',
              }}
            >
              <span>С вами поделились шрифтами</span>
              <span>в количестве (шт.):</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 120,
                fontWeight: 600,
                color: '#111827',
                lineHeight: 1,
                marginTop: 16,
              }}
            >
              {String(data.total || 0)}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.showStatic ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: 12,
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                <span>СТАТИЧЕСКИХ</span>
                <span>{String(data.staticCount)}</span>
              </div>
            ) : null}
            {data.showVariable ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: data.showStatic ? 'none' : '1px solid #e5e7eb',
                  paddingTop: data.showStatic ? 0 : 12,
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                <span>ВАРИАТИВНЫХ</span>
                <span>{String(data.variableCount)}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            width: '50%',
            height: '100%',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#e85d4a',
          }}
        >
          {backgroundDataUrl ? (
            <img
              src={backgroundDataUrl}
              alt=""
              width={rightWidth}
              height={SHARE_OG_HEIGHT}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : null}
          <div
            style={{
              display: 'flex',
              position: 'relative',
              width: '100%',
              height: '100%',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignContent: 'center',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 36,
            }}
          >
            {badges.map((name, idx) => {
              const isOthers = name === null;
              return (
                <div
                  key={`${name ?? 'more'}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#ffffff',
                    borderRadius: 999,
                    padding: '12px 22px',
                    maxWidth: 280,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#111827',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {badgeLabel(name, isOthers ? overflow : 0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    {
      width: SHARE_OG_WIDTH,
      height: SHARE_OG_HEIGHT,
      fonts: [
        {
          name: 'Inter',
          data: fontData,
          style: 'normal',
          weight: 600,
        },
      ],
    },
  );
}
