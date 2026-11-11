import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from './session';
import { AccountError, TeamUser } from './users';

/** Shared helpers for the account API routes. */

export async function readJson<T>(req: NextRequest): Promise<Partial<T>> {
  // Only accept JSON (a cross-site <form> can't send it — basic CSRF protection
  // on top of the SameSite=Lax session cookie).
  if (!req.headers.get('content-type')?.includes('application/json')) return {};
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    return {};
  }
}

export const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Runs `fn` for a logged-in user (admin only when `admin` is true). */
export async function withUser(
  req: NextRequest,
  fn: (user: TeamUser) => Promise<Response>,
  { admin = false } = {},
) {
  const user = await getRequestUser(req);
  if (!user) return fail('Faça login novamente.', 401);
  if (admin && user.role !== 'admin') return fail('Só administradores podem fazer isso.', 403);
  try {
    return await fn(user);
  } catch (e) {
    if (e instanceof AccountError) return fail(e.message);
    console.error(e);
    return fail('Algo deu errado. Tente de novo.', 500);
  }
}
