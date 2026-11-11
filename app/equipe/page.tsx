import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { listUsers, toPublic } from '@/lib/auth/users';
import { TeamManager } from './TeamManager';

export const dynamic = 'force-dynamic';

/** Team management (administrators only). */
export default async function TeamPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/equipe');
  if (me.role !== 'admin') redirect('/');
  const users = (await listUsers()).map(toPublic);
  return <TeamManager me={me.email} initialUsers={users} />;
}
