// ============================================================================
// Leave Ledger Service — Manages per-month entitlement overrides
// ============================================================================

import { readSheet } from '@/lib/google-sheets';
import { LeaveLedgerEntry, SHEET_NAMES } from '@/lib/types';

const SHEET = SHEET_NAMES.LEAVE_LEDGER;

function parseLedgerEntry(row: string[]): LeaveLedgerEntry {
  return {
    employeeId: row[0] || '',
    year: parseInt(row[1]) || 0,
    month: parseInt(row[2]) || 0,
    monthlyEntitlement: parseFloat(row[3]) || 1,
    notes: row[4] || '',
  };
}

/**
 * Get all ledger entries for an employee.
 */
export async function getEmployeeLedger(
  employeeId: string
): Promise<LeaveLedgerEntry[]> {
  const data = await readSheet(SHEET);
  if (data.length <= 1) return [];

  return data
    .slice(1)
    .map(parseLedgerEntry)
    .filter((e) => e.employeeId === employeeId);
}

/**
 * Get all ledger entries.
 */
export async function getAllLedgerEntries(): Promise<LeaveLedgerEntry[]> {
  const data = await readSheet(SHEET);
  if (data.length <= 1) return [];
  return data.slice(1).map(parseLedgerEntry);
}
