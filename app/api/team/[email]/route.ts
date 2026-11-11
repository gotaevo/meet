import { NextRequest, NextResponse } from 'next/server';
import { fail, readJson, str, withUser } from '@/lib/auth/api';
import { normalizeEmail, removeUser, setPassword, toPublic, updateUser } from '@/lib/auth/users';

export const runtime = 'nodejs';

type Params = { params: Promise<{ email: string }> };

/** Change someone's name, admin flag or password (admins only). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const email = normalizeEmail(decodeURIComponent((await params).email));
  return withUser(
    req,
    async (me) => {
      const body = await readJson<{ name: string; admin: boolean; password: string }>(req);
      if (typeof body.admin === 'boolean' && email === me.email && !body.admin) {
        return fail('Você não pode tirar o seu próprio acesso de administrador.');
      }
      if (body.password !== undefined) await setPassword(email, str(body.password));
      const user = await updateUser(email, {
        name: body.name !== undefined ? str(body.name) : undefined,
        role: typeof body.admin === 'boolean' ? (body.admin ? 'admin' : 'member') : undefined,
      });
      return NextResponse.json({ user: toPublic(user) });
    },
    { admin: true },
  );
}

/** Remove someone (admins only). Their open sessions stop working immediately. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const email = normalizeEmail(decodeURIComponent((await params).email));
  return withUser(
    req,
    async (me) => {
      if (email === me.email) return fail('Você não pode remover a sua própria conta.');
      await removeUser(email);
      return NextResponse.json({ ok: true });
    },
    { admin: true },
  );
}
