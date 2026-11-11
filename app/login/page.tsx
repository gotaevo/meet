import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { hasAnyUser } from '@/lib/auth/users';
import { LoginForm } from './LoginForm';

/** Only same-site paths are allowed as "next" (no open redirects). */
function safeNext(next: string | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (!(await hasAnyUser())) redirect('/configurar');
  if (await getCurrentUser()) redirect(next);
  return <LoginForm next={next} />;
}
