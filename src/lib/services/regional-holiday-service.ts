// ============================================================================
// Regional Holiday Request Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendToSheet, updateRowByColumnValue } from '@/lib/google-sheets';
import { RegionalHolidayRequest, RegionalHolidayStatus, SHEET_NAMES } from '@/lib/types';

const SHEET = SHEET_NAMES.REGIONAL_HOLIDAY_REQUESTS;

function parseRequest(row: string[]): RegionalHolidayRequest {
  return {
    id: row[0] || '',
    employeeId: row[1] || '',
    employeeName: row[2] || '',
    holidayName: row[3] || '',
    date: row[4] || '',
    reason: row[5] || '',
    status: (row[6] as RegionalHolidayStatus) || 'PENDING',
    requestedAt: row[7] || '',
    reviewedBy: row[8] || '',
    reviewedAt: row[9] || '',
    reviewerComment: row[10] || '',
  };
}

function requestToRow(r: RegionalHolidayRequest): string[] {
  return [
    r.id, r.employeeId, r.employeeName, r.holidayName,
    r.date, r.reason, r.status, r.requestedAt,
    r.reviewedBy, r.reviewedAt, r.reviewerComment,
  ];
}

export async function getRegionalHolidayRequests(): Promise<RegionalHolidayRequest[]> {
  const data = await readSheet(SHEET);
  if (data.length <= 1) return [];
  return data.slice(1).map(parseRequest);
}

export async function getEmployeeRegionalHolidays(
  employeeId: string
): Promise<RegionalHolidayRequest[]> {
  const all = await getRegionalHolidayRequests();
  return all.filter((r) => r.employeeId === employeeId);
}

export async function getPendingRegionalHolidays(): Promise<RegionalHolidayRequest[]> {
  const all = await getRegionalHolidayRequests();
  return all.filter((r) => r.status === 'PENDING');
}

export async function getRegionalHolidayById(
  id: string
): Promise<RegionalHolidayRequest | null> {
  const all = await getRegionalHolidayRequests();
  return all.find((r) => r.id === id) || null;
}

export async function createRegionalHolidayRequest(data: {
  employeeId: string;
  employeeName: string;
  holidayName: string;
  date: string;
  reason: string;
}): Promise<RegionalHolidayRequest> {
  const request: RegionalHolidayRequest = {
    id: uuidv4(),
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    holidayName: data.holidayName,
    date: data.date,
    reason: data.reason,
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
    reviewedBy: '',
    reviewedAt: '',
    reviewerComment: '',
  };

  await appendToSheet(SHEET, [requestToRow(request)]);
  return request;
}

async function updateRegionalHolidayStatus(
  id: string,
  status: RegionalHolidayStatus,
  reviewerName: string,
  comment: string
): Promise<RegionalHolidayRequest | null> {
  const request = await getRegionalHolidayById(id);
  if (!request) return null;

  if (request.status !== 'PENDING') {
    throw new Error(
      `This request has already been ${request.status.toLowerCase().replace('_', ' ')}. No further action needed.`
    );
  }

  const updated: RegionalHolidayRequest = {
    ...request,
    status,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
    reviewerComment: comment,
  };

  const success = await updateRowByColumnValue(SHEET, 0, id, requestToRow(updated));
  return success ? updated : null;
}

export async function approveRegionalHolidayPaid(
  id: string,
  reviewerName: string,
  comment: string
): Promise<RegionalHolidayRequest | null> {
  return updateRegionalHolidayStatus(id, 'APPROVED_PAID', reviewerName, comment);
}

export async function approveRegionalHolidayUnpaid(
  id: string,
  reviewerName: string,
  comment: string
): Promise<RegionalHolidayRequest | null> {
  return updateRegionalHolidayStatus(id, 'APPROVED_UNPAID', reviewerName, comment);
}

export async function rejectRegionalHoliday(
  id: string,
  reviewerName: string,
  comment: string
): Promise<RegionalHolidayRequest | null> {
  return updateRegionalHolidayStatus(id, 'REJECTED', reviewerName, comment);
}
