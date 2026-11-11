import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken, SESSION_COOKIE } from '@/lib/auth/tokens';

/**
 * Pages that only the team (@taevo.com.br, logged in) can open.
 * Rooms are NOT here: guests reach them with an invite link; the token API
 * (/api/connection-details) checks the session or the invite itself.
 */
export async function middleware(req: NextRequest) {
  const session = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value).catch(() => null);
  if (session) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const next = req.nextUrl.pathname + req.nextUrl.search;
  if (next !== '/') url.searchParams.set('next', next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/', '/custom/:path*', '/equipe', '/conta'],
};
