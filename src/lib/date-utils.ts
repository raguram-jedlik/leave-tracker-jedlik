// ============================================================================
// Date Utilities — Pure date calculation functions safe for client & server
// ============================================================================

/**
 * Calculate the number of calendar days between two dates (inclusive).
 * Both dates are in YYYY-MM-DD format.
 */
export function calculateLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00+05:30');
  const end = new Date(endDate + 'T00:00:00+05:30');

  if (end < start) return 0;

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Split leave days across months.
 * Returns an array of { year, month, days } for a leave spanning multiple months.
 */
export function splitLeaveAcrossMonths(
  startDate: string,
  endDate: string
): { year: number; month: number; days: number }[] {
  const result: { year: number; month: number; days: number }[] = [];
  const start = new Date(startDate + 'T00:00:00+05:30');
  const end = new Date(endDate + 'T00:00:00+05:30');

  const current = new Date(start);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1; // 1-based

    // Find end of this month or end of leave, whichever comes first
    const endOfMonth = new Date(year, current.getMonth() + 1, 0); // Last day of month
    const segmentEnd = end < endOfMonth ? end : endOfMonth;

    const days = Math.floor(
      (segmentEnd.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    result.push({ year, month, days });

    // Move to first day of next month
    current.setDate(1);
    current.setMonth(current.getMonth() + 1);
  }

  return result;
}
