/**
 * Signed session cookies and room invites (HMAC-SHA256 via Web Crypto, so this
 * works in middleware/edge and in Node route handlers alike). No database:
 * everything is verified with AUTH_SECRET.
 */

export const SESSION_COOKIE = 'taevo_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const ALLOWED_DOMAIN = '@taevo.com.br';

export interface Session {
  email: string;
  name: string;
  /** account version: bumped on password change / removal, which ends old sessions */
  v: number;
  /** expiry, unix seconds */
  exp: number;
}

const enc = new TextEncoder();

let cachedSecret: Promise<string> | undefined;

/**
 * Signing secret: AUTH_SECRET if set, otherwise one generated on first use and kept
 * in the account store (so nobody has to create it by hand).
 */
async function getSecret(): Promise<string> {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv) {
    if (fromEnv.length < 32) throw new Error('AUTH_SECRET is too short (min. 32 characters)');
    return fromEnv;
  }
  cachedSecret ??= (async () => {
    const { getKV } = await import('./store');
    const kv = getKV();
    const fresh = b64url(crypto.getRandomValues(new Uint8Array(48)));
    await kv.set('auth:secret', fresh, { nx: true });
    const secret = await kv.get('auth:secret');
    if (!secret) throw new Error('Could not load the auth secret');
    return secret;
  })().catch((e) => {
    cachedSecret = undefined;
    throw e;
  });
  return cachedSecret;
}

export function b64url(bytes: Uint8Array) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

const keyCache = new Map<string, Promise<CryptoKey>>();
function hmacKey(secret: string) {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ]);
    keyCache.set(secret, key);
  }
  return key;
}

async function sign(data: string) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(await getSecret()), enc.encode(data));
  return b64url(new Uint8Array(sig));
}

async function verify(data: string, signature: string) {
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await hmacKey(await getSecret()),
      b64urlDecode(signature),
      enc.encode(data),
    );
  } catch {
    return false;
  }
}

export async function createSessionToken(email: string, name: string, v = 1, now = Date.now()) {
  const session: Session = { email, name, v, exp: Math.floor(now / 1000) + SESSION_MAX_AGE };
  const payload = b64url(enc.encode(JSON.stringify(session)));
  return `${payload}.${await sign(`session.${payload}`)}`;
}

export async function readSessionToken(token: string | undefined, now = Date.now()): Promise<Session | null> {
  if (!token) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  if (!(await verify(`session.${payload}`, signature))) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Session;
    if (typeof session.email !== 'string' || !session.email.endsWith(ALLOWED_DOMAIN)) return null;
    if (typeof session.exp !== 'number' || session.exp * 1000 < now) return null;
    if (typeof session.v !== 'number') return null;
    return session;
  } catch {
    return null;
  }
}

/** Invite code for a room: lets people without an account join THAT room only. */
export async function createInviteCode(roomName: string) {
  const full = await sign(`invite.${roomName}`);
  return full.slice(0, 22); // 128 bits is plenty and keeps links short
}

export async function isValidInvite(roomName: string, code: string | null | undefined) {
  if (!code || code.length !== 22) return false;
  const expected = await createInviteCode(roomName);
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ code.charCodeAt(i);
  return diff === 0;
}
