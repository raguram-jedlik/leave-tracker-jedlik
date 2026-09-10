import { describe, it, expect } from 'vitest';
import { isPaidLeaveCycleSlotConsumed, calculateLeaveBalance } from './leave-calculation';
import type { LeaveRequest } from '@/lib/types';

function req(partial: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 'r',
    employeeId: 'e1',
    employeeName: 'Alice',
    leaveType: 'PAID',
    startDate: '2026-08-28',
    endDate: '2026-08-30',
    numberOfDays: 3,
    reason: '',
    status: 'PENDING',
    requestedAt: '',
    reviewedBy: '',
    reviewedAt: '',
    reviewerComment: '',
    ...partial,
  };
}

describe('isPaidLeaveCycleSlotConsumed', () => {
  it('returns false when employee has no existing paid leaves', () => {
    expect(isPaidLeaveCycleSlotConsumed([], '2026-09-10')).toBe(false);
  });

  it('returns true when a PENDING paid leave starts in the same cycle', () => {
    const existing = [
      req({ id: 'a', startDate: '2026-08-28', endDate: '2026-08-30', status: 'PENDING' }),
    ];
    expect(isPaidLeaveCycleSlotConsumed(existing, '2026-09-10')).toBe(true);
  });

  it('returns true when an APPROVED paid leave starts in the same cycle', () => {
    const existing = [
      req({ id: 'a', startDate: '2026-09-05', endDate: '2026-09-05', status: 'APPROVED' }),
    ];
    expect(isPaidLeaveCycleSlotConsumed(existing, '2026-09-20')).toBe(true);
  });

  it('returns false when only CANCELLED or REJECTED paid leaves exist in the cycle', () => {
    const existing = [
      req({ id: 'a', status: 'CANCELLED', startDate: '2026-09-01', endDate: '2026-09-02' }),
      req({ id: 'b', status: 'REJECTED', startDate: '2026-09-10', endDate: '2026-09-10' }),
    ];
    expect(isPaidLeaveCycleSlotConsumed(existing, '2026-09-15')).toBe(false);
  });

  it('returns false when the existing paid leave is in a different cycle', () => {
    const existing = [
      req({ id: 'a', status: 'APPROVED', startDate: '2026-07-20', endDate: '2026-07-22' }),
    ];
    // 2026-07-20 is in cycle 26 Jun – 25 Jul; new request 10 Aug is in 26 Jul – 25 Aug
    expect(isPaidLeaveCycleSlotConsumed(existing, '2026-08-10')).toBe(false);
  });

  it('ignores UNPAID leaves even if they are in the same cycle', () => {
    const existing = [
      req({ id: 'a', leaveType: 'UNPAID', status: 'APPROVED', startDate: '2026-09-05', endDate: '2026-09-05' }),
    ];
    expect(isPaidLeaveCycleSlotConsumed(existing, '2026-09-20')).toBe(false);
  });

  it('does not count a leave that crosses the cycle boundary — only the start cycle matters', () => {
    const existing = [
      // start 23 Sep, end 27 Sep — cycle is 26 Aug – 25 Sep (start cycle)
      req({ id: 'a', status: 'APPROVED', startDate: '2026-09-23', endDate: '2026-09-27' }),
    ];
    // new request 28 Sep is in the NEXT cycle (26 Sep – 25 Oct), should be allowed
    expect(isPaidLeaveCycleSlotConsumed(existing, '2026-09-28')).toBe(false);
    // new request 24 Sep is in the SAME start cycle, should be blocked
    expect(isPaidLeaveCycleSlotConsumed(existing, '2026-09-24')).toBe(true);
  });

  it('handles Dec/Jan cycle crossover correctly', () => {
    const existing = [
      req({ id: 'a', status: 'APPROVED', startDate: '2026-12-30', endDate: '2026-12-30' }),
    ];
    // 2026-12-30 is in cycle 26 Dec 2026 – 25 Jan 2027
    // new request 5 Jan 2027 is in same cycle
    expect(isPaidLeaveCycleSlotConsumed(existing, '2027-01-05')).toBe(true);
    // new request 28 Feb 2027 is in cycle 26 Feb – 25 Mar, should be free
    expect(isPaidLeaveCycleSlotConsumed(existing, '2027-02-28')).toBe(false);
  });
});

describe('calculateLeaveBalance', () => {
  it('returns cycle info and reports slot as free when no PAID leave in current cycle', async () => {
    const balance = await calculateLeaveBalance([], new Date(2026, 8, 15));
    expect(balance.currentCycle).toEqual({
      startDate: '2026-08-26',
      endDate: '2026-09-25',
      label: '26 Aug – 25 Sep 2026',
    });
    expect(balance.cycleSlotUsed).toBe(false);
    expect(balance.cycleSlotUsedBy).toBeUndefined();
  });

  it('reports slot as used when a PENDING PAID leave starts in the current cycle', async () => {
    const existing = [
      req({ id: 'a', status: 'PENDING', startDate: '2026-09-05', endDate: '2026-09-05' }),
    ];
    const balance = await calculateLeaveBalance(existing, new Date(2026, 8, 15));
    expect(balance.cycleSlotUsed).toBe(true);
    expect(balance.cycleSlotUsedBy).toEqual({
      startDate: '2026-09-05',
      endDate: '2026-09-05',
      status: 'PENDING',
    });
  });

  it('reports slot as used when an APPROVED PAID leave starts in the current cycle', async () => {
    const existing = [
      req({ id: 'a', status: 'APPROVED', startDate: '2026-08-28', endDate: '2026-08-30' }),
    ];
    const balance = await calculateLeaveBalance(existing, new Date(2026, 8, 15));
    expect(balance.cycleSlotUsed).toBe(true);
    expect(balance.cycleSlotUsedBy?.status).toBe('APPROVED');
  });

  it('does not count CANCELLED or REJECTED PAID leaves in the current cycle', async () => {
    const existing = [
      req({ id: 'a', status: 'CANCELLED', startDate: '2026-09-05', endDate: '2026-09-05' }),
      req({ id: 'b', status: 'REJECTED', startDate: '2026-09-10', endDate: '2026-09-10' }),
    ];
    const balance = await calculateLeaveBalance(existing, new Date(2026, 8, 15));
    expect(balance.cycleSlotUsed).toBe(false);
  });

  it('does not count PAID leaves that fall outside the current cycle', async () => {
    const existing = [
      // cycle 26 Jun – 25 Jul
      req({ id: 'a', status: 'APPROVED', startDate: '2026-07-20', endDate: '2026-07-22' }),
      // cycle 26 Sep – 25 Oct
      req({ id: 'b', status: 'APPROVED', startDate: '2026-09-28', endDate: '2026-09-28' }),
    ];
    const balance = await calculateLeaveBalance(existing, new Date(2026, 8, 15));
    expect(balance.cycleSlotUsed).toBe(false);
  });

  it('does not count UNPAID leaves for the slot', async () => {
    const existing = [
      req({ id: 'a', leaveType: 'UNPAID', status: 'APPROVED', startDate: '2026-09-05', endDate: '2026-09-05' }),
    ];
    const balance = await calculateLeaveBalance(existing, new Date(2026, 8, 15));
    expect(balance.cycleSlotUsed).toBe(false);
  });
});
