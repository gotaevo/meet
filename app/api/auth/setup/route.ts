import { NextRequest, NextResponse } from 'next/server';
import { fail, readJson, str } from '@/lib/auth/api';
import { sessionCookie } from '@/lib/auth/session';
import { AccountError, createFirstAdmin } from '@/lib/auth/users';

export const runtime = 'nodejs';

/** First run only: creates the first administrator and logs them in. */
export async function POST(req: NextRequest) {
  const body = await readJson<{ email: string; name: string; password: string }>(req);
  try {
    const user = await createFirstAdmin({
      email: str(body.email),
      name: str(body.name),
      password: str(body.password),
    });
    const res = NextResponse.json({ ok: true });
    const c = await sessionCookie(user);
    res.cookies.set(c.name, c.value, c.options);
    return res;
  } catch (e) {
    if (e instanceof AccountError) return fail(e.message, 400);
    console.error(e);
    return fail('Não foi possível concluir a configuração.', 500);
  }
}
