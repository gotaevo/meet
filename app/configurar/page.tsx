import { redirect } from 'next/navigation';
import { hasAnyUser } from '@/lib/auth/users';
import { SetupForm } from './SetupForm';

export const dynamic = 'force-dynamic';

/** First run: create the administrator account. Disappears once any account exists. */
export default async function SetupPage() {
  if (await hasAnyUser()) redirect('/login');
  return <SetupForm />;
}
