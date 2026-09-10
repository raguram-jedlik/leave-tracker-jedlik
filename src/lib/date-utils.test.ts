import { describe, it, expect } from 'vitest';
import { getCycleForDate, getCurrentCycle, type LeaveCycle } from './date-utils';

describe('getCycleForDate', () => {
  it('returns cycle starting on the 26th for dates on/after the 26th', () => {
    const cycle = getCycleForDate(new Date(2026, 7, 28)); // 28 Aug 2026
    expect(cycle).toEqual<LeaveCycle>({
      startDate: '2026-08-26',
      endDate: '2026-09-25',
      label: '26 Aug – 25 Sep 2026',
    });
  });

  it('returns cycle starting on the previous 26th for dates on/before the 25th', () => {
    const cycle = getCycleForDate(new Date(2026, 8, 10)); // 10 Sep 2026
    expect(cycle).toEqual<LeaveCycle>({
      startDate: '2026-08-26',
      endDate: '2026-09-25',
      label: '26 Aug – 25 Sep 2026',
    });
  });

  it('treats the 25th as the last day of the cycle that started the previous month', () => {
    const cycle = getCycleForDate(new Date(2026, 8, 25)); // 25 Sep 2026
    expect(cycle.startDate).toBe('2026-08-26');
    expect(cycle.endDate).toBe('2026-09-25');
  });

  it('treats the 26th as the first day of the next cycle', () => {
    const cycle = getCycleForDate(new Date(2026, 8, 26)); // 26 Sep 2026
    expect(cycle.startDate).toBe('2026-09-26');
    expect(cycle.endDate).toBe('2026-10-25');
  });

  it('handles the 26 Dec → 25 Jan crossover into the next year', () => {
    const cycle = getCycleForDate(new Date(2026, 11, 30)); // 30 Dec 2026
    expect(cycle.startDate).toBe('2026-12-26');
    expect(cycle.endDate).toBe('2027-01-25');
  });

  it('handles a January date that belongs to a Dec→Jan cycle', () => {
    const cycle = getCycleForDate(new Date(2027, 0, 5)); // 5 Jan 2027
    expect(cycle.startDate).toBe('2026-12-26');
    expect(cycle.endDate).toBe('2027-01-25');
  });

  it('handles February (short month) end correctly', () => {
    const cycle = getCycleForDate(new Date(2026, 1, 10)); // 10 Feb 2026
    expect(cycle.startDate).toBe('2026-01-26');
    expect(cycle.endDate).toBe('2026-02-25');
  });
});

describe('getCurrentCycle', () => {
  it('returns the cycle that contains the given reference date', () => {
    const cycle = getCurrentCycle(new Date(2026, 8, 15)); // 15 Sep 2026
    expect(cycle.startDate).toBe('2026-08-26');
    expect(cycle.endDate).toBe('2026-09-25');
  });
});
