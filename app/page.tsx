import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { HomeClient } from './HomeClient';

export default async function Page() {
  // middleware already guards "/", this is a second check
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <HomeClient userName={user.name} isAdmin={user.role === 'admin'} />;
}
