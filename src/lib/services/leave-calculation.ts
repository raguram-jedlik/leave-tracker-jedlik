// ============================================================================
// Leave Calculation Engine
// Core business logic for leave balance, entitlement, carry-forward
// ============================================================================

import {
  LeaveBalance,
  LeaveRequest,
  LeaveLedgerEntry,
} from '@/lib/types';
import {
  calculateLeaveDays,
  getCycleForDate,
  LeaveCycle,
  getCurrentCycle,
} from '@/lib/date-utils';

// Re-export for backward compatibility with existing server-side callers
export { calculateLeaveDays, getCycleForDate };

/**
 * Return the cycle (26th–25th) that an employee's existing requests cover
 * for the given reference date, plus whether their PAID slot is already used.
 *
 * The cycle rule: each employee is allowed exactly 1 PAID leave request per
 * cycle. A request whose start date falls in the cycle consumes the slot.
 * Cancelled and rejected requests do not consume it. UNPAID and
 * regional-holiday requests never consume it.
 *
 * `ledgerEntries` is accepted for API back-compat but ignored — the
 * monthly-accrual / ledger-override model has been retired.
 */
export async function calculateLeaveBalance(
  leaveRequests: LeaveRequest[],
  referenceDate?: Date,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ledgerEntries?: LeaveLedgerEntry[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _employeeStartDate?: string
): Promise<LeaveBalance> {
  const now = referenceDate ?? new Date();
  const cycle = getCycleForDate(now);
  const cycleStart = cycle.startDate;

  const consuming = leaveRequests.find(
    (r) =>
      r.leaveType === 'PAID' &&
      (r.status === 'PENDING' || r.status === 'APPROVED') &&
      getCycleForDate(new Date(r.startDate + 'T00:00:00+05:30')).startDate === cycleStart
  );

  return {
    currentCycle: cycle,
    cycleSlotUsed: !!consuming,
    cycleSlotUsedBy: consuming
      ? {
          startDate: consuming.startDate,
          endDate: consuming.endDate,
          status: consuming.status,
        }
      : undefined,
  };
}

/**
 * Whether the employee has already used their PAID-leave slot for the cycle
 * containing the given start date. A cycle runs from the 26th of one month to
 * the 25th of the next. A PAID request whose start date falls in the cycle
 * consumes the slot, regardless of how many days it spans. Cancelled and
 * rejected requests do not consume the slot. UNPAID and regional-holiday
 * requests never consume the slot.
 */
export function isPaidLeaveCycleSlotConsumed(
  existingRequests: LeaveRequest[],
  newStartDate: string
): boolean {
  const newCycle = getCycleForDate(new Date(newStartDate + 'T00:00:00+05:30'));
  return existingRequests.some(
    (r) =>
      r.leaveType === 'PAID' &&
      (r.status === 'PENDING' || r.status === 'APPROVED') &&
      getCycleForDate(new Date(r.startDate + 'T00:00:00+05:30')).startDate ===
        newCycle.startDate
  );
}

/**
 * Return the cycle containing the given date.
 * Re-exported so callers can render the cycle in the UI.
 */
export type { LeaveCycle };

// Re-export getCurrentCycle for callers that want the label
export { getCurrentCycle };

/**
 * Validate a leave request before submission.
 * Returns null if valid, or an error message string.
 */
export async function validateLeaveRequest(
  employeeStartDate: string,
  existingRequests: LeaveRequest[],
  ledgerEntries: LeaveLedgerEntry[],
  newRequest: {
    leaveType: string;
    startDate: string;
    endDate: string;
  },
  publicHolidayDates: string[]
): Promise<string | null> {
  const { leaveType, startDate, endDate } = newRequest;

  // Validate dates
  const start = new Date(startDate + 'T00:00:00+05:30');
  const end = new Date(endDate + 'T00:00:00+05:30');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (end < start) {
    return 'End date must be on or after start date.';
  }

  if (start < today) {
    return 'Cannot request leave for past dates.';
  }

  const numberOfDays = calculateLeaveDays(startDate, endDate);

  if (numberOfDays <= 0) {
    return 'Leave must be at least 1 day.';
  }

  // Check for public holidays
  const current = new Date(start);
  const publicHolidayConflicts: string[] = [];
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (publicHolidayDates.includes(dateStr)) {
      publicHolidayConflicts.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }

  if (publicHolidayConflicts.length === numberOfDays) {
    return 'All requested dates are already public holidays. No leave needed.';
  }

  if (publicHolidayConflicts.length > 0) {
    return `Some of your requested dates (${publicHolidayConflicts.join(', ')}) are public holidays. You may want to adjust your dates.`;
  }

  // Check for conflicting leave requests (same dates, active requests)
  const activeRequests = existingRequests.filter(
    (r) => r.status === 'PENDING' || r.status === 'APPROVED'
  );

  for (const req of activeRequests) {
    const reqStart = new Date(req.startDate + 'T00:00:00+05:30');
    const reqEnd = new Date(req.endDate + 'T00:00:00+05:30');

    // Check date overlap
    if (start <= reqEnd && end >= reqStart) {
      return `You already have a ${req.status.toLowerCase()} leave request (${req.startDate} to ${req.endDate}) that overlaps with these dates.`;
    }
  }

  // Check paid leave cycle slot
  if (leaveType === 'PAID') {
    const slotConsumed = isPaidLeaveCycleSlotConsumed(existingRequests, startDate);
    if (slotConsumed) {
      const cycle = getCycleForDate(new Date(startDate + 'T00:00:00+05:30'));
      return `You already have a paid leave in this cycle (${cycle.label}). Only 1 paid leave is allowed per cycle (26th–25th).`;
    }
  }

  return null; // Valid
}
