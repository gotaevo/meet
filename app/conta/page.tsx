import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { AccountForm } from './AccountForm';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/conta');
  return <AccountForm name={me.name} email={me.email} />;
}
