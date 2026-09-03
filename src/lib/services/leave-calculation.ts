// ============================================================================
// Leave Calculation Engine
// Core business logic for leave balance, entitlement, carry-forward
// ============================================================================

import {
  LeaveBalance,
  MonthlyBreakdown,
  LeaveRequest,
  LeaveLedgerEntry,
  SETTINGS_KEYS,
} from '@/lib/types';
import { getSettings } from '@/lib/services/settings-service';
import { calculateLeaveDays, splitLeaveAcrossMonths } from '@/lib/date-utils';

// Re-export for backward compatibility with existing server-side callers
export { calculateLeaveDays, splitLeaveAcrossMonths };

/**
 * Get the monthly entitlement from settings.
 * Defaults to 1 if not configured.
 */
export async function getMonthlyEntitlement(): Promise<number> {
  const settings = await getSettings();
  const setting = settings.find((s) => s.key === SETTINGS_KEYS.MONTHLY_ENTITLEMENT);
  return setting ? parseFloat(setting.value) : 1;
}

/**
 * Calculate the total number of months of entitlement from startDate to referenceDate.
 */
function calculateEntitlementMonths(startDate: string, referenceDate: Date): number {
  const start = new Date(startDate + 'T00:00:00+05:30');
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-based

  const startYear = start.getFullYear();
  const startMonth = start.getMonth(); // 0-based

  // Number of complete months from start to reference (inclusive of both start and current month)
  let months = (refYear - startYear) * 12 + (refMonth - startMonth) + 1;

  if (months < 0) months = 0;

  return months;
}

/**
 * Calculate leave balance for an employee.
 *
 * Logic:
 * 1. Count total months from employee start date to now → total entitlement
 * 2. Check leave ledger for any overrides
 * 3. Sum approved PAID leave days → consumed
 * 4. Sum pending PAID leave days → reserved
 * 5. Available = total entitlement - consumed
 * 6. Unreserved = available - reserved
 */
export async function calculateLeaveBalance(
  employeeStartDate: string,
  leaveRequests: LeaveRequest[],
  ledgerEntries: LeaveLedgerEntry[],
  referenceDate?: Date
): Promise<LeaveBalance> {
  const now = referenceDate || new Date();
  const monthlyEntitlement = await getMonthlyEntitlement();

  // Calculate total months of entitlement
  const totalMonths = calculateEntitlementMonths(employeeStartDate, now);

  // Check ledger for any custom entitlements
  let totalEntitlement = 0;
  const start = new Date(employeeStartDate + 'T00:00:00+05:30');

  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    // Check if there's a ledger override for this month
    const override = ledgerEntries.find(
      (e) => e.year === year && e.month === month
    );

    if (override) {
      totalEntitlement += override.monthlyEntitlement;
    } else {
      totalEntitlement += monthlyEntitlement;
    }
  }

  // Calculate approved paid leave
  const approvedPaidLeave = leaveRequests
    .filter((r) => r.status === 'APPROVED' && r.leaveType === 'PAID')
    .reduce((sum, r) => sum + r.numberOfDays, 0);

  // Calculate pending reserved paid leave
  const pendingReserved = leaveRequests
    .filter((r) => r.status === 'PENDING' && r.leaveType === 'PAID')
    .reduce((sum, r) => sum + r.numberOfDays, 0);

  const availableBalance = totalEntitlement - approvedPaidLeave;
  const unreservedBalance = availableBalance - pendingReserved;

  return {
    totalEntitlement,
    approvedPaidLeave,
    pendingReserved,
    availableBalance,
    unreservedBalance,
  };
}

/**
 * Calculate month-by-month breakdown of leave balance.
 */
export async function calculateMonthlyBreakdown(
  employeeStartDate: string,
  leaveRequests: LeaveRequest[],
  ledgerEntries: LeaveLedgerEntry[],
  referenceDate?: Date
): Promise<MonthlyBreakdown[]> {
  const now = referenceDate || new Date();
  const monthlyEntitlement = await getMonthlyEntitlement();
  const totalMonths = calculateEntitlementMonths(employeeStartDate, now);
  const start = new Date(employeeStartDate + 'T00:00:00+05:30');

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const breakdown: MonthlyBreakdown[] = [];
  let runningBalance = 0;

  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    // Check ledger override
    const override = ledgerEntries.find(
      (e) => e.year === year && e.month === month
    );
    const entitlement = override ? override.monthlyEntitlement : monthlyEntitlement;

    // Approved paid leave used in this month
    const approvedUsed = leaveRequests
      .filter((r) => r.status === 'APPROVED' && r.leaveType === 'PAID')
      .reduce((sum, r) => {
        const segments = splitLeaveAcrossMonths(r.startDate, r.endDate);
        const segment = segments.find((s) => s.year === year && s.month === month);
        return sum + (segment?.days || 0);
      }, 0);

    // Pending reserved in this month
    const pendingReserved = leaveRequests
      .filter((r) => r.status === 'PENDING' && r.leaveType === 'PAID')
      .reduce((sum, r) => {
        const segments = splitLeaveAcrossMonths(r.startDate, r.endDate);
        const segment = segments.find((s) => s.year === year && s.month === month);
        return sum + (segment?.days || 0);
      }, 0);

    const openingBalance = runningBalance;
    const closingBalance = openingBalance + entitlement - approvedUsed;
    runningBalance = closingBalance;

    breakdown.push({
      year,
      month,
      monthName: monthNames[month],
      openingBalance,
      entitlement,
      approvedUsed,
      pendingReserved,
      closingBalance,
    });
  }

  return breakdown;
}

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

  // Check paid leave balance
  if (leaveType === 'PAID') {
    const balance = await calculateLeaveBalance(
      employeeStartDate,
      existingRequests,
      ledgerEntries
    );

    if (numberOfDays > balance.unreservedBalance) {
      return `Insufficient paid leave balance. You have ${balance.unreservedBalance} day(s) available (${balance.availableBalance} available, ${balance.pendingReserved} pending). Requested: ${numberOfDays} day(s).`;
    }
  }

  return null; // Valid
}
