// ============================================================================
// Leave Server Actions — Request, approve, reject, cancel leave
// ============================================================================

'use server';

import { auth } from '@/lib/auth';
import { getEmployeeById } from '@/lib/services/employee-service';
import {
  createLeaveRequest,
  getEmployeeLeaveRequests,
  getLeaveRequests,
  getPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
} from '@/lib/services/leave-service';
import { getEmployeeLedger } from '@/lib/services/leave-ledger-service';
import { getPublicHolidayDates } from '@/lib/services/public-holiday-service';
import {
  calculateLeaveBalance,
  calculateMonthlyBreakdown,
  calculateLeaveDays,
  validateLeaveRequest,
} from '@/lib/services/leave-calculation';
import { writeAuditLog } from '@/lib/services/audit-service';
import {
  sendNewLeaveRequestEmail,
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
} from '@/lib/services/email-service';
import {
  AUDIT_ACTIONS,
  LeaveBalance,
  LeaveRequest,
  MonthlyBreakdown,
  ApiResponse,
} from '@/lib/types';

export async function getMyLeaveBalance(): Promise<ApiResponse<LeaveBalance>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  try {
    const employee = await getEmployeeById(session.user.id);
    if (!employee) return { success: false, error: 'Employee not found.' };

    const requests = await getEmployeeLeaveRequests(session.user.id);
    const ledger = await getEmployeeLedger(session.user.id);

    const balance = await calculateLeaveBalance(
      employee.startDate,
      requests,
      ledger
    );

    return { success: true, data: balance };
  } catch (error) {
    console.error('Error getting leave balance:', error);
    return { success: false, error: 'Unable to load leave balance. Please try again.' };
  }
}

export async function getMyLeaveBreakdown(): Promise<ApiResponse<MonthlyBreakdown[]>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  try {
    const employee = await getEmployeeById(session.user.id);
    if (!employee) return { success: false, error: 'Employee not found.' };

    const requests = await getEmployeeLeaveRequests(session.user.id);
    const ledger = await getEmployeeLedger(session.user.id);

    const breakdown = await calculateMonthlyBreakdown(
      employee.startDate,
      requests,
      ledger
    );

    return { success: true, data: breakdown };
  } catch (error) {
    console.error('Error getting breakdown:', error);
    return { success: false, error: 'Unable to load leave breakdown. Please try again.' };
  }
}

export async function getEmployeeLeaveBalance(
  employeeId: string
): Promise<ApiResponse<LeaveBalance>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  // Only admin/approver can view other employees' balances
  if (
    session.user.id !== employeeId &&
    session.user.role !== 'ADMIN' &&
    session.user.role !== 'APPROVER'
  ) {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const employee = await getEmployeeById(employeeId);
    if (!employee) return { success: false, error: 'Employee not found.' };

    const requests = await getEmployeeLeaveRequests(employeeId);
    const ledger = await getEmployeeLedger(employeeId);

    const balance = await calculateLeaveBalance(
      employee.startDate,
      requests,
      ledger
    );

    return { success: true, data: balance };
  } catch (error) {
    console.error('Error getting employee leave balance:', error);
    return { success: false, error: 'Unable to load leave balance.' };
  }
}

export async function submitLeaveRequest(data: {
  leaveType: 'PAID' | 'UNPAID';
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<ApiResponse<LeaveRequest>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  // Validate input
  if (!data.leaveType || !data.startDate || !data.endDate || !data.reason.trim()) {
    return { success: false, error: 'All fields are required.' };
  }

  try {
    const employee = await getEmployeeById(session.user.id);
    if (!employee) return { success: false, error: 'Employee not found.' };

    const existingRequests = await getEmployeeLeaveRequests(session.user.id);
    const ledger = await getEmployeeLedger(session.user.id);
    const publicHolidayDates = await getPublicHolidayDates();

    // Validate the request
    const validationError = await validateLeaveRequest(
      employee.startDate,
      existingRequests,
      ledger,
      {
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      publicHolidayDates
    );

    if (validationError) {
      return { success: false, error: validationError };
    }

    const numberOfDays = calculateLeaveDays(data.startDate, data.endDate);

    const request = await createLeaveRequest({
      employeeId: session.user.id,
      employeeName: session.user.name,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      numberOfDays,
      reason: data.reason.trim(),
    });

    // Audit log
    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.LEAVE_REQUESTED,
      targetId: request.id,
      details: `${data.leaveType} leave: ${data.startDate} to ${data.endDate} (${numberOfDays} days)`,
    });

    // Email notification (non-blocking)
    sendNewLeaveRequestEmail(request).catch(console.error);

    return { success: true, data: request, message: 'Leave request submitted successfully.' };
  } catch (error) {
    console.error('Error submitting leave request:', error);
    return { success: false, error: 'Failed to submit leave request. Please try again.' };
  }
}

export async function getMyLeaveRequests(): Promise<ApiResponse<LeaveRequest[]>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  try {
    const requests = await getEmployeeLeaveRequests(session.user.id);
    // Sort by requestedAt descending
    requests.sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    return { success: true, data: requests };
  } catch (error) {
    console.error('Error getting leave requests:', error);
    return { success: false, error: 'Unable to load leave requests.' };
  }
}

export async function getAllLeaveRequests(): Promise<ApiResponse<LeaveRequest[]>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const requests = await getLeaveRequests();
    requests.sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    return { success: true, data: requests };
  } catch (error) {
    console.error('Error getting all leave requests:', error);
    return { success: false, error: 'Unable to load leave requests.' };
  }
}

export async function getPendingApprovals(): Promise<ApiResponse<LeaveRequest[]>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const pending = await getPendingLeaveRequests();
    pending.sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    return { success: true, data: pending };
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return { success: false, error: 'Unable to load pending approvals.' };
  }
}

export async function approveLeave(
  requestId: string,
  comment: string
): Promise<ApiResponse<LeaveRequest>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized to approve leave requests.' };
  }

  try {
    const result = await approveLeaveRequest(requestId, session.user.name, comment);
    if (!result) return { success: false, error: 'Leave request not found.' };

    // Cannot approve own request
    if (result.employeeId === session.user.id) {
      return { success: false, error: 'You cannot approve your own leave request.' };
    }

    // Audit log
    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.LEAVE_APPROVED,
      targetId: requestId,
      details: `Approved ${result.employeeName}'s ${result.leaveType} leave (${result.startDate} to ${result.endDate})`,
    });

    // Email notification (non-blocking)
    const employee = await getEmployeeById(result.employeeId);
    if (employee) {
      sendLeaveApprovedEmail(result, employee.email).catch(console.error);
    }

    return { success: true, data: result, message: 'Leave request approved.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve leave request.';
    return { success: false, error: message };
  }
}

export async function rejectLeave(
  requestId: string,
  comment: string
): Promise<ApiResponse<LeaveRequest>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized to reject leave requests.' };
  }

  try {
    const result = await rejectLeaveRequest(requestId, session.user.name, comment);
    if (!result) return { success: false, error: 'Leave request not found.' };

    // Audit log
    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.LEAVE_REJECTED,
      targetId: requestId,
      details: `Rejected ${result.employeeName}'s ${result.leaveType} leave (${result.startDate} to ${result.endDate})`,
    });

    // Email notification (non-blocking)
    const employee = await getEmployeeById(result.employeeId);
    if (employee) {
      sendLeaveRejectedEmail(result, employee.email).catch(console.error);
    }

    return { success: true, data: result, message: 'Leave request rejected.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject leave request.';
    return { success: false, error: message };
  }
}

export async function cancelMyLeaveRequest(
  requestId: string
): Promise<ApiResponse<LeaveRequest>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  try {
    const result = await cancelLeaveRequest(requestId, session.user.id);
    if (!result) return { success: false, error: 'Leave request not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.LEAVE_CANCELLED,
      targetId: requestId,
    });

    return { success: true, data: result, message: 'Leave request cancelled.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel leave request.';
    return { success: false, error: message };
  }
}
