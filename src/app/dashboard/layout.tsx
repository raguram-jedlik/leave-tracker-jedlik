import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard-shell';
import { ToastProvider } from '@/components/toast-provider';
import { SessionProvider } from '@/components/session-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <SessionProvider user={session.user}>
      <ToastProvider>
        <DashboardShell user={session.user}>
          {children}
        </DashboardShell>
      </ToastProvider>
    </SessionProvider>
  );
}
