import {
  deviceLabelFromUserAgent,
  getDeviceCookieName,
  hashDeviceFingerprint,
  newDeviceId,
  parseDeviceIdFromCookie,
} from './deviceFingerprint';
import { sendLoginCodeEmail } from './sendLoginCodeEmail';
import {
  createLoginChallenge,
  isStepUpLoginAvailable,
  isStepUpLoginDisabled,
  isTrustedDevice,
  issueLoginToken,
  touchTrustedDevice,
  trustDevice,
} from './stepUpLogin';
import { authenticateCredentialsForLogin } from './userStore';

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

export function buildLoginDeviceContext(req) {
  const cookieHeader = req.headers.cookie || '';
  const deviceId = parseDeviceIdFromCookie(cookieHeader);
  const userAgent = req.headers['user-agent'] || '';
  const ip = getClientIp(req);
  return { deviceId, userAgent, ip, cookieHeader };
}

export function deviceHashForUser(userId, { deviceId, userAgent, ip }) {
  return hashDeviceFingerprint({ userId, deviceId, userAgent, ip });
}

export async function initiateCredentialsLogin(req, { email, password }) {
  if (!isStepUpLoginAvailable()) {
    throw Object.assign(new Error('Step-up login storage unavailable'), { code: 'UNAVAILABLE' });
  }

  const auth = await authenticateCredentialsForLogin({ email, password });
  if (auth.status === 'invalid') {
    return { status: 'invalid' };
  }
  if (auth.status === 'unverified') {
    return { status: 'unverified', email: auth.email };
  }

  const user = auth.user;
  const device = buildLoginDeviceContext(req);
  const deviceHash = deviceHashForUser(user.id, device);

  if (isStepUpLoginDisabled()) {
    const loginToken = await issueLoginToken(user.id);
    return {
      status: 'token',
      loginToken,
      newDeviceId: device.deviceId || newDeviceId(),
    };
  }

  const trusted = await isTrustedDevice({ userId: user.id, deviceHash });
  if (trusted) {
    await touchTrustedDevice({ userId: user.id, deviceHash });
    const loginToken = await issueLoginToken(user.id);
    return {
      status: 'token',
      loginToken,
      newDeviceId: device.deviceId || newDeviceId(),
    };
  }

  const { challengeId, codePlain } = await createLoginChallenge({
    userId: user.id,
    deviceHash,
  });

  try {
    await sendLoginCodeEmail({
      to: user.email,
      name: user.name,
      code: codePlain,
    });
  } catch (e) {
    if (e?.code === 'EMAIL_FAILED') {
      return { status: 'email_failed', email: user.email };
    }
    throw e;
  }

  return {
    status: 'needs_code',
    challengeId,
    email: user.email,
    newDeviceId: device.deviceId || newDeviceId(),
  };
}

export async function completeLoginChallenge(req, { challengeId, code, trustDevice: shouldTrust }) {
  const { verifyLoginChallenge } = await import('./stepUpLogin');
  const device = buildLoginDeviceContext(req);
  const result = await verifyLoginChallenge({ challengeId, code });
  const loginToken = await issueLoginToken(result.userId);

  if (shouldTrust && result.deviceHash) {
    await trustDevice({
      userId: result.userId,
      deviceHash: result.deviceHash,
      deviceLabel: deviceLabelFromUserAgent(device.userAgent),
    });
  }

  return { loginToken, newDeviceId: device.deviceId || newDeviceId() };
}

export function deviceCookieHeader(deviceId) {
  const maxAge = 30 * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${getDeviceCookieName()}=${encodeURIComponent(deviceId)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}
