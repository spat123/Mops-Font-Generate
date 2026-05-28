import { promisify } from 'util';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';

const scrypt = promisify(_scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(String(password), salt, 64)) as Buffer;
  return {
    salt,
    hash: Buffer.from(derived).toString('hex'),
  };
}

export async function verifyPassword(
  password: string,
  { salt, hash }: { salt?: string; hash?: string },
) {
  if (!salt || !hash) return false;
  const derived = (await scrypt(String(password), String(salt), 64)) as Buffer;
  const a = Buffer.from(derived);
  const b = Buffer.from(String(hash), 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

