// ============================================================================
// Auth Server Actions — Login, change password
// ============================================================================

'use server';

import { signIn, signOut } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { changePassword } from '@/lib/services/employee-service';
import { writeAuditLog } from '@/lib/services/audit-service';
import { AUDIT_ACTIONS } from '@/lib/types';
import { AuthError } from 'next-auth';

export async function loginAction(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await signIn('credentials', {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: 'Invalid email or password. Please try again.',
      };
    }
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

export async function logoutAction(): Promise<void> {
  const session = await auth();
  if (session?.user) {
    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.LOGOUT,
    });
  }

  await signOut({ redirect: false });
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated.' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  if (currentPassword === newPassword) {
    return { success: false, error: 'New password must be different from current password.' };
  }

  try {
    const result = await changePassword(session.user.id, currentPassword, newPassword);
    if (!result) {
      return { success: false, error: 'Failed to update password.' };
    }

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change password.';
    return { success: false, error: message };
  }
}
