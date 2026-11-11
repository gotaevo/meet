import { NextRequest, NextResponse } from 'next/server';
import { readJson, str, withUser } from '@/lib/auth/api';
import { createUser, listUsers, toPublic } from '@/lib/auth/users';

export const runtime = 'nodejs';

/** Team list (admins only). */
export async function GET(req: NextRequest) {
  return withUser(req, async () => NextResponse.json({ users: (await listUsers()).map(toPublic) }), {
    admin: true,
  });
}

/** Add a person (admins only). */
export async function POST(req: NextRequest) {
  return withUser(
    req,
    async () => {
      const body = await readJson<{ email: string; name: string; password: string; admin: boolean }>(req);
      const user = await createUser({
        email: str(body.email),
        name: str(body.name),
        password: str(body.password),
        role: body.admin === true ? 'admin' : 'member',
      });
      return NextResponse.json({ user: toPublic(user) });
    },
    { admin: true },
  );
}
