import { LeaveStatus, RegionalHolidayStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: LeaveStatus | RegionalHolidayStatus | string }) {
  const map: Record<string, string> = {
    PENDING: 'badge badge-pending',
    APPROVED: 'badge badge-approved',
    REJECTED: 'badge badge-rejected',
    CANCELLED: 'badge badge-cancelled',
    APPROVED_PAID: 'badge badge-approved',
    APPROVED_UNPAID: 'badge badge-paid',
    PAID: 'badge badge-paid',
    UNPAID: 'badge badge-unpaid',
  };

  const labels: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    APPROVED_PAID: 'Approved (Paid)',
    APPROVED_UNPAID: 'Approved (Unpaid)',
    PAID: 'Paid Leave',
    UNPAID: 'Unpaid Leave',
  };

  const className = map[status] || 'badge badge-cancelled';
  const label = labels[status] || status;

  return <span className={className}>{label}</span>;
}
