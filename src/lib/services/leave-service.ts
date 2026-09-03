// ============================================================================
// Leave Request Service — CRUD operations for leave requests
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendToSheet, updateRowByColumnValue } from '@/lib/google-sheets';
import { LeaveRequest, LeaveType, SHEET_NAMES } from '@/lib/types';

const SHEET = SHEET_NAMES.LEAVE_REQUESTS;

function parseLeaveRequest(row: string[]): LeaveRequest {
  return {
    id: row[0] || '',
    employeeId: row[1] || '',
    employeeName: row[2] || '',
    leaveType: (row[3] as LeaveType) || 'PAID',
    startDate: row[4] || '',
    endDate: row[5] || '',
    numberOfDays: parseFloat(row[6]) || 0,
    reason: row[7] || '',
    status: (row[8] as LeaveRequest['status']) || 'PENDING',
    requestedAt: row[9] || '',
    reviewedBy: row[10] || '',
    reviewedAt: row[11] || '',
    reviewerComment: row[12] || '',
  };
}

function leaveRequestToRow(req: LeaveRequest): string[] {
  return [
    req.id,
    req.employeeId,
    req.employeeName,
    req.leaveType,
    req.startDate,
    req.endDate,
    req.numberOfDays.toString(),
    req.reason,
    req.status,
    req.requestedAt,
    req.reviewedBy,
    req.reviewedAt,
    req.reviewerComment,
  ];
}

/**
 * Get all leave requests.
 */
export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const data = await readSheet(SHEET);
  if (data.length <= 1) return [];
  return data.slice(1).map(parseLeaveRequest);
}

/**
 * Get leave requests for a specific employee.
 */
export async function getEmployeeLeaveRequests(
  employeeId: string
): Promise<LeaveRequest[]> {
  const all = await getLeaveRequests();
  return all.filter((r) => r.employeeId === employeeId);
}

/**
 * Get pending leave requests.
 */
export async function getPendingLeaveRequests(): Promise<LeaveRequest[]> {
  const all = await getLeaveRequests();
  return all.filter((r) => r.status === 'PENDING');
}

/**
 * Get a leave request by ID.
 */
export async function getLeaveRequestById(
  requestId: string
): Promise<LeaveRequest | null> {
  const all = await getLeaveRequests();
  return all.find((r) => r.id === requestId) || null;
}

/**
 * Create a new leave request.
 */
export async function createLeaveRequest(data: {
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  reason: string;
}): Promise<LeaveRequest> {
  const request: LeaveRequest = {
    id: uuidv4(),
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,
    numberOfDays: data.numberOfDays,
    reason: data.reason,
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
    reviewedBy: '',
    reviewedAt: '',
    reviewerComment: '',
  };

  await appendToSheet(SHEET, [leaveRequestToRow(request)]);
  return request;
}

/**
 * Approve a leave request.
 * Includes double-approval protection — checks current status before updating.
 */
export async function approveLeaveRequest(
  requestId: string,
  reviewerName: string,
  comment: string
): Promise<LeaveRequest | null> {
  // Re-fetch to get latest state (double-approval protection)
  const request = await getLeaveRequestById(requestId);
  if (!request) return null;

  if (request.status !== 'PENDING') {
    throw new Error(
      `This request has already been ${request.status.toLowerCase()}. No further action needed.`
    );
  }

  const updated: LeaveRequest = {
    ...request,
    status: 'APPROVED',
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
    reviewerComment: comment,
  };

  const success = await updateRowByColumnValue(
    SHEET,
    0,
    requestId,
    leaveRequestToRow(updated)
  );

  return success ? updated : null;
}

/**
 * Reject a leave request.
 * Includes double-approval protection.
 */
export async function rejectLeaveRequest(
  requestId: string,
  reviewerName: string,
  comment: string
): Promise<LeaveRequest | null> {
  const request = await getLeaveRequestById(requestId);
  if (!request) return null;

  if (request.status !== 'PENDING') {
    throw new Error(
      `This request has already been ${request.status.toLowerCase()}. No further action needed.`
    );
  }

  const updated: LeaveRequest = {
    ...request,
    status: 'REJECTED',
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
    reviewerComment: comment,
  };

  const success = await updateRowByColumnValue(
    SHEET,
    0,
    requestId,
    leaveRequestToRow(updated)
  );

  return success ? updated : null;
}

/**
 * Cancel a leave request (by the employee).
 */
export async function cancelLeaveRequest(
  requestId: string,
  employeeId: string
): Promise<LeaveRequest | null> {
  const request = await getLeaveRequestById(requestId);
  if (!request) return null;

  if (request.employeeId !== employeeId) {
    throw new Error('You can only cancel your own leave requests.');
  }

  if (request.status !== 'PENDING') {
    throw new Error('Only pending requests can be cancelled.');
  }

  const updated: LeaveRequest = {
    ...request,
    status: 'CANCELLED',
    reviewedBy: 'Self',
    reviewedAt: new Date().toISOString(),
    reviewerComment: 'Cancelled by employee',
  };

  const success = await updateRowByColumnValue(
    SHEET,
    0,
    requestId,
    leaveRequestToRow(updated)
  );

  return success ? updated : null;
}
