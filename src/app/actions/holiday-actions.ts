// ============================================================================
// Holiday Server Actions — Public holidays and regional holidays
// ============================================================================

'use server';

import { auth } from '@/lib/auth';
import {
  getPublicHolidays,
  createPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday,
} from '@/lib/services/public-holiday-service';
import {
  getRegionalHolidayRequests,
  getEmployeeRegionalHolidays,
  getPendingRegionalHolidays,
  createRegionalHolidayRequest,
  approveRegionalHolidayPaid,
  approveRegionalHolidayUnpaid,
  rejectRegionalHoliday,
} from '@/lib/services/regional-holiday-service';
import { getEmployeeById } from '@/lib/services/employee-service';
import { writeAuditLog } from '@/lib/services/audit-service';
import {
  sendNewRegionalHolidayEmail,
  sendRegionalHolidayDecisionEmail,
} from '@/lib/services/email-service';
import {
  AUDIT_ACTIONS,
  PublicHoliday,
  RegionalHolidayRequest,
  ApiResponse,
} from '@/lib/types';

// --- Public Holidays ---

export async function getPublicHolidaysList(): Promise<ApiResponse<PublicHoliday[]>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  try {
    const holidays = await getPublicHolidays();
    holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { success: true, data: holidays };
  } catch (error) {
    console.error('Error getting holidays:', error);
    return { success: false, error: 'Unable to load public holidays.' };
  }
}

export async function addPublicHoliday(data: {
  name: string;
  date: string;
  description: string;
}): Promise<ApiResponse<PublicHoliday>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can manage public holidays.' };
  }

  if (!data.name.trim() || !data.date) {
    return { success: false, error: 'Holiday name and date are required.' };
  }

  try {
    const holiday = await createPublicHoliday({
      name: data.name.trim(),
      date: data.date,
      description: data.description.trim(),
      createdBy: session.user.name,
    });

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.PUBLIC_HOLIDAY_ADDED,
      targetId: holiday.id,
      details: `${holiday.name} on ${holiday.date}`,
    });

    return { success: true, data: holiday, message: 'Public holiday added.' };
  } catch (error) {
    console.error('Error adding holiday:', error);
    return { success: false, error: 'Failed to add public holiday.' };
  }
}

export async function editPublicHoliday(
  id: string,
  updates: { name?: string; date?: string; description?: string }
): Promise<ApiResponse<PublicHoliday>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can manage public holidays.' };
  }

  try {
    const result = await updatePublicHoliday(id, updates);
    if (!result) return { success: false, error: 'Holiday not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.PUBLIC_HOLIDAY_EDITED,
      targetId: id,
      details: `Updated: ${result.name}`,
    });

    return { success: true, data: result, message: 'Holiday updated.' };
  } catch (error) {
    console.error('Error updating holiday:', error);
    return { success: false, error: 'Failed to update public holiday.' };
  }
}

export async function removePublicHoliday(id: string): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can manage public holidays.' };
  }

  try {
    const result = await deletePublicHoliday(id);
    if (!result) return { success: false, error: 'Holiday not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.PUBLIC_HOLIDAY_DELETED,
      targetId: id,
    });

    return { success: true, message: 'Public holiday deleted.' };
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return { success: false, error: 'Failed to delete public holiday.' };
  }
}

// --- Regional Holidays ---

export async function getMyRegionalHolidays(): Promise<
  ApiResponse<RegionalHolidayRequest[]>
> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  try {
    const requests = await getEmployeeRegionalHolidays(session.user.id);
    requests.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    return { success: true, data: requests };
  } catch (error) {
    console.error('Error getting regional holidays:', error);
    return { success: false, error: 'Unable to load regional holiday requests.' };
  }
}

export async function getAllRegionalHolidays(): Promise<
  ApiResponse<RegionalHolidayRequest[]>
> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const requests = await getRegionalHolidayRequests();
    requests.sort(
      (a, b) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    return { success: true, data: requests };
  } catch (error) {
    console.error('Error getting all regional holidays:', error);
    return { success: false, error: 'Unable to load regional holiday requests.' };
  }
}

export async function getPendingRegionalHolidaysList(): Promise<
  ApiResponse<RegionalHolidayRequest[]>
> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const pending = await getPendingRegionalHolidays();
    return { success: true, data: pending };
  } catch (error) {
    console.error('Error getting pending regional holidays:', error);
    return { success: false, error: 'Unable to load pending requests.' };
  }
}

export async function submitRegionalHoliday(data: {
  holidayName: string;
  date: string;
  reason: string;
}): Promise<ApiResponse<RegionalHolidayRequest>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (!data.holidayName.trim() || !data.date || !data.reason.trim()) {
    return { success: false, error: 'All fields are required.' };
  }

  try {
    const request = await createRegionalHolidayRequest({
      employeeId: session.user.id,
      employeeName: session.user.name,
      holidayName: data.holidayName.trim(),
      date: data.date,
      reason: data.reason.trim(),
    });

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.REGIONAL_HOLIDAY_REQUESTED,
      targetId: request.id,
      details: `${data.holidayName} on ${data.date}`,
    });

    // Email notification
    sendNewRegionalHolidayEmail(request).catch(console.error);

    return {
      success: true,
      data: request,
      message: 'Regional holiday request submitted.',
    };
  } catch (error) {
    console.error('Error submitting regional holiday:', error);
    return { success: false, error: 'Failed to submit request.' };
  }
}

export async function approveRegionalPaid(
  id: string,
  comment: string
): Promise<ApiResponse<RegionalHolidayRequest>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const result = await approveRegionalHolidayPaid(
      id,
      session.user.name,
      comment
    );
    if (!result) return { success: false, error: 'Request not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.REGIONAL_HOLIDAY_APPROVED_PAID,
      targetId: id,
      details: `${result.employeeName}: ${result.holidayName}`,
    });

    const employee = await getEmployeeById(result.employeeId);
    if (employee) {
      sendRegionalHolidayDecisionEmail(result, employee.email).catch(
        console.error
      );
    }

    return { success: true, data: result, message: 'Approved as paid holiday.' };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to approve request.';
    return { success: false, error: message };
  }
}

export async function approveRegionalUnpaid(
  id: string,
  comment: string
): Promise<ApiResponse<RegionalHolidayRequest>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const result = await approveRegionalHolidayUnpaid(
      id,
      session.user.name,
      comment
    );
    if (!result) return { success: false, error: 'Request not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.REGIONAL_HOLIDAY_APPROVED_UNPAID,
      targetId: id,
      details: `${result.employeeName}: ${result.holidayName}`,
    });

    const employee = await getEmployeeById(result.employeeId);
    if (employee) {
      sendRegionalHolidayDecisionEmail(result, employee.email).catch(
        console.error
      );
    }

    return {
      success: true,
      data: result,
      message: 'Approved as unpaid holiday.',
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to approve request.';
    return { success: false, error: message };
  }
}

export async function rejectRegionalHolidayAction(
  id: string,
  comment: string
): Promise<ApiResponse<RegionalHolidayRequest>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN' && session.user.role !== 'APPROVER') {
    return { success: false, error: 'Not authorized.' };
  }

  try {
    const result = await rejectRegionalHoliday(
      id,
      session.user.name,
      comment
    );
    if (!result) return { success: false, error: 'Request not found.' };

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.REGIONAL_HOLIDAY_REJECTED,
      targetId: id,
      details: `${result.employeeName}: ${result.holidayName}`,
    });

    const employee = await getEmployeeById(result.employeeId);
    if (employee) {
      sendRegionalHolidayDecisionEmail(result, employee.email).catch(
        console.error
      );
    }

    return { success: true, data: result, message: 'Regional holiday rejected.' };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reject request.';
    return { success: false, error: message };
  }
}
