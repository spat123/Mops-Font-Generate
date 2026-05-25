import crypto from 'crypto';

const DEVICE_COOKIE = 'df_device';

export function getDeviceCookieName() {
  return DEVICE_COOKIE;
}

export function parseDeviceIdFromCookie(cookieHeader) {
  const raw = String(cookieHeader || '');
  const match = raw.match(new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    const id = decodeURIComponent(match[1]).trim();
    return /^[a-f0-9-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

function normalizeUserAgent(ua) {
  return String(ua || '')
    .trim()
    .slice(0, 200)
    .toLowerCase();
}

/** IPv4: первые 3 октета; IPv6: первые 4 группы — меньше ложных срабатываний на LTE. */
function normalizeIpSubnet(ip) {
  const raw = String(ip || '').trim();
  if (!raw) return '';
  if (raw.includes('.')) {
    const parts = raw.split('.');
    return parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : raw;
  }
  if (raw.includes(':')) {
    const parts = raw.split(':').filter(Boolean);
    return parts.slice(0, 4).join(':');
  }
  return raw;
}

/** С IP/UA — если cookie устройства ещё нет (первый визит в браузере). */
export function hashDeviceFingerprintWithNetwork({ userId, userAgent, ip, deviceId }) {
  const payload = [
    String(userId || ''),
    String(deviceId || ''),
    normalizeUserAgent(userAgent),
    normalizeIpSubnet(ip),
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Для доверенного устройства: при наличии df_device cookie не учитываем IP/UA.
 * Иначе за nginx/CDN (Timeweb, Vercel) IP меняется между запросами — ложный «новый вход».
 */
export function hashDeviceFingerprint({ userId, userAgent, ip, deviceId }) {
  const uid = String(userId || '');
  const did = String(deviceId || '').trim();
  if (did) {
    return crypto.createHash('sha256').update([uid, did].join('|')).digest('hex');
  }
  return hashDeviceFingerprintWithNetwork({ userId: uid, userAgent, ip, deviceId: '' });
}

export function deviceLabelFromUserAgent(userAgent) {
  const ua = String(userAgent || '');
  if (/edg\//i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'Браузер';
}

export function newDeviceId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}
