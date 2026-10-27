import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Perfil } from './domain';

/** scrypt with a per-password salt; format `scrypt$<salt>$<hash>` (base64url). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = scryptSync(password, Buffer.from(salt, 'base64url'), expected.length);
  return timingSafeEqual(actual, expected);
}

/** A hash compared against when the e-mail does not exist, so response time does not reveal accounts. */
export const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(12).toString('hex'));

export interface TokenClaims {
  sub: string;
  perfil: Perfil;
  iat: number;
  exp: number;
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const HEADER = encode({ alg: 'HS256', typ: 'JWT' });

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** Minimal HS256 JWT, compatible with standard JWT libraries. */
export function createToken(userId: number, perfil: Perfil, secret: string, ttlSeconds: number, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload = encode({ sub: String(userId), perfil, iat, exp: iat + ttlSeconds } satisfies TokenClaims);
  const data = `${HEADER}.${payload}`;
  return `${data}.${sign(data, secret)}`;
}

/** Returns the claims when the signature is valid and the token has not expired; otherwise null. */
export function verifyToken(token: string, secret: string, now = Date.now()): TokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  if (header !== HEADER) return null;
  const expected = Buffer.from(sign(`${header}.${payload}`, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenClaims;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) return null;
    if (typeof claims.sub !== 'string') return null;
    return claims;
  } catch {
    return null;
  }
}

export function bearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}
