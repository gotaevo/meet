import { NextRequest, NextResponse } from 'next/server';
import { fail, readJson, str, withUser } from '@/lib/auth/api';
import { verifyPassword } from '@/lib/auth/password';
import { sessionCookie } from '@/lib/auth/session';
import { getUser, setPassword } from '@/lib/auth/users';

export const runtime = 'nodejs';

/** Change your own password (asks for the current one). Other sessions are logged out. */
export async function POST(req: NextRequest) {
  return withUser(req, async (me) => {
    const body = await readJson<{ current: string; password: string }>(req);
    if (!(await verifyPassword(str(body.current), me.hash))) return fail('A senha atual está incorreta.');
    await setPassword(me.email, str(body.password));
    const updated = (await getUser(me.email))!;
    const res = NextResponse.json({ ok: true });
    const c = await sessionCookie(updated);
    res.cookies.set(c.name, c.value, c.options); // keep this device logged in
    return res;
  });
}
