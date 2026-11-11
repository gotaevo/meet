import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { createSessionToken, readSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from './tokens';
import { TeamUser, userForSession } from './users';

/**
 * The logged-in account (Server Components / route handlers), or null.
 * Besides the cookie signature, the account must still exist with the same
 * version — so removing someone or changing their password logs them out.
 */
export async function getCurrentUser() {
  const store = await cookies();
  return userForSession(await readSessionToken(store.get(SESSION_COOKIE)?.value));
}

export async function getRequestUser(req: NextRequest) {
  return userForSession(await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value));
}

export async function sessionCookie(user: TeamUser) {
  return {
    name: SESSION_COOKIE,
    value: await createSessionToken(user.email, user.name, user.v),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE,
    },
  };
}
