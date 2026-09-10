// ============================================================================
// Date Utilities — Pure date calculation functions safe for client & server
// ============================================================================

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export interface LeaveCycle {
  /** YYYY-MM-DD of the cycle's first day (always the 26th). */
  startDate: string;
  /** YYYY-MM-DD of the cycle's last day (always the 25th). */
  endDate: string;
  /** Human-readable label, e.g. "26 Aug – 25 Sep 2026". */
  label: string;
}

/**
 * Return the 26→25 cycle that contains the given date.
 * Dates on/after the 26th belong to the cycle starting that 26th;
 * dates on/before the 25th belong to the cycle starting the previous 26th.
 */
export function getCycleForDate(date: Date): LeaveCycle {
  const start: Date =
    date.getDate() >= 26
      ? new Date(date.getFullYear(), date.getMonth(), 26)
      : new Date(date.getFullYear(), date.getMonth() - 1, 26);

  const end = new Date(start.getFullYear(), start.getMonth() + 1, 25);

  const startMonthName = MONTH_NAMES[start.getMonth()];
  const endMonthName = MONTH_NAMES[end.getMonth()];
  const endYear = end.getFullYear();

  return {
    startDate: toYmd(start),
    endDate: toYmd(end),
    label: `26 ${startMonthName} – 25 ${endMonthName} ${endYear}`,
  };
}

/**
 * Return the 26→25 cycle that contains the reference date (defaults to now).
 */
export function getCurrentCycle(referenceDate?: Date): LeaveCycle {
  return getCycleForDate(referenceDate ?? new Date());
}

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
