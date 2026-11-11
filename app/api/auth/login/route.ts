import { NextRequest, NextResponse } from 'next/server';
import { DUMMY_HASH, verifyPassword } from '@/lib/auth/password';
import { sessionCookie } from '@/lib/auth/session';
import { getUser, isTeamEmail } from '@/lib/auth/users';

export const runtime = 'nodejs';

/**
 * Brute-force protection: too many wrong attempts for the same e-mail or IP block
 * that e-mail / IP for 15 minutes. In-memory (per server instance) — together with
 * the slow scrypt hash this makes online guessing impractical.
 */
// Per e-mail: 5 wrong passwords. Per IP: 30 (a whole office may share one IP,
// so a low IP limit would let an attacker lock everyone out).
const MAX_FAILS_EMAIL = 5;
const MAX_FAILS_IP = 30;
const LOCK_MS = 15 * 60 * 1000;
const fails = new Map<string, { count: number; until: number }>();

function locked(key: string, now: number) {
  const f = fails.get(key);
  const max = key.startsWith('ip:') ? MAX_FAILS_IP : MAX_FAILS_EMAIL;
  return !!f && f.count >= max && f.until > now;
}
function recordFail(key: string, now: number) {
  const f = fails.get(key);
  const count = f && f.until > now ? f.count + 1 : 1;
  fails.set(key, { count, until: now + LOCK_MS });
  if (fails.size > 10_000) fails.clear();
}

export async function POST(req: NextRequest) {
  const now = Date.now();
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 256) {
    return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const keys = [`e:${email}`, `ip:${ip}`];
  if (keys.some((k) => locked(k, now))) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' },
      { status: 429 },
    );
  }

  const user = isTeamEmail(email) ? await getUser(email) : null;
  // Always run scrypt, so response time doesn't reveal whether the e-mail exists.
  const ok = await verifyPassword(password, user?.hash ?? DUMMY_HASH);
  if (!user || !ok) {
    keys.forEach((k) => recordFail(k, now));
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
  }
  keys.forEach((k) => fails.delete(k));

  const res = NextResponse.json({ ok: true, name: user.name });
  const c = await sessionCookie(user);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
