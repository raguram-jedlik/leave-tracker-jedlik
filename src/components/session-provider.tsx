'use client';

import { createContext, useContext } from 'react';
import { SessionUser } from '@/lib/types';

// This is a simple client-side session context.
// The actual session data is passed from the server layout to the dashboard shell.
// We store it in a context so all client components can access it.

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={user}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionUser {
  const session = useContext(SessionContext);
  if (!session) {
    // Fallback - attempt to parse from cookie or return default
    return {
      id: '',
      name: 'User',
      email: '',
      role: 'EMPLOYEE',
      mustChangePassword: false,
    };
  }
  return session;
}
