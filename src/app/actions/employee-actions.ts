// ============================================================================
// Employee Management Server Actions (Admin only)
// ============================================================================

'use server';

import { auth } from '@/lib/auth';
import {
  getEmployeesPublic,
  getActiveEmployeesPublic,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  resetEmployeePassword,
} from '@/lib/services/employee-service';
import { writeAuditLog } from '@/lib/services/audit-service';
import { AUDIT_ACTIONS, EmployeePublic, ApiResponse } from '@/lib/types';

export async function getAllEmployees(): Promise<ApiResponse<EmployeePublic[]>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const employees = session.user.role === 'ADMIN'
      ? await getEmployeesPublic()
      : await getActiveEmployeesPublic();
    return { success: true, data: employees };
  } catch (error) {
    console.error('Error getting employees:', error);
    return { success: false, error: 'Unable to load employees.' };
  }
}

export async function addEmployee(data: {
  name: string;
  email: string;
  role: 'ADMIN' | 'APPROVER' | 'EMPLOYEE';
  startDate: string;
  temporaryPassword: string;
}): Promise<ApiResponse<EmployeePublic>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can add employees.' };
  }

  if (!data.name.trim() || !data.email.trim() || !data.temporaryPassword) {
    return { success: false, error: 'All fields are required.' };
  }

  if (data.temporaryPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  try {
    const employee = await createEmployee({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      password: data.temporaryPassword,
      startDate: data.startDate,
    });

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.EMPLOYEE_ADDED,
      targetId: employee.id,
      details: `Added employee: ${employee.name} (${employee.email})`,
    });

    return { success: true, data: employee, message: 'Employee added successfully.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add employee.';
    return { success: false, error: message };
  }
}

export async function editEmployee(
  id: string,
  updates: { name?: string; email?: string; role?: 'ADMIN' | 'APPROVER' | 'EMPLOYEE'; startDate?: string }
): Promise<ApiResponse<EmployeePublic>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can edit employees.' };
  }

  try {
    const result = await updateEmployee(id, updates);
    if (!result) return { success: false, error: 'Employee not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.EMPLOYEE_UPDATED,
      targetId: id,
      details: `Updated employee: ${result.name}`,
    });

    return { success: true, data: result, message: 'Employee updated.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update employee.';
    return { success: false, error: message };
  }
}

export async function deactivateEmployeeAction(
  id: string
): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can deactivate employees.' };
  }

  if (id === session.user.id) {
    return { success: false, error: 'You cannot deactivate your own account.' };
  }

  try {
    const result = await deactivateEmployee(id);
    if (!result) return { success: false, error: 'Employee not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.EMPLOYEE_DEACTIVATED,
      targetId: id,
    });

    return { success: true, message: 'Employee deactivated.' };
  } catch (error) {
    console.error('Error deactivating employee:', error);
    return { success: false, error: 'Failed to deactivate employee.' };
  }
}

export async function reactivateEmployeeAction(
  id: string
): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can reactivate employees.' };
  }

  try {
    const result = await reactivateEmployee(id);
    if (!result) return { success: false, error: 'Employee not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.EMPLOYEE_REACTIVATED,
      targetId: id,
    });

    return { success: true, message: 'Employee reactivated.' };
  } catch (error) {
    console.error('Error reactivating employee:', error);
    return { success: false, error: 'Failed to reactivate employee.' };
  }
}

export async function resetPasswordAction(
  id: string,
  newPassword: string
): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can reset passwords.' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  try {
    const result = await resetEmployeePassword(id, newPassword);
    if (!result) return { success: false, error: 'Employee not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      targetId: id,
    });

    return { success: true, message: 'Password reset successfully. Employee will need to change it on next login.' };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'Failed to reset password.' };
  }
}
