// ============================================================================
// Audit Log Service
// ============================================================================

import { appendToSheet } from '@/lib/google-sheets';
import { readSheet } from '@/lib/google-sheets';
import { AuditLogEntry, SHEET_NAMES } from '@/lib/types';

const SHEET = SHEET_NAMES.AUDIT_LOG;

/**
 * Write an audit log entry.
 * This should never throw — audit failures should not break business operations.
 */
export async function writeAuditLog(data: {
  userId: string;
  userName: string;
  action: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    const row = [
      new Date().toISOString(),
      data.userId,
      data.userName,
      data.action,
      data.targetId || '',
      data.details || '',
      data.ipAddress || '',
    ];

    await appendToSheet(SHEET, [row]);
  } catch (error) {
    // Audit log failures should not break the main operation
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Get audit log entries (most recent first).
 */
export async function getAuditLogs(limit?: number): Promise<AuditLogEntry[]> {
  const data = await readSheet(SHEET);
  if (data.length <= 1) return [];

  const entries = data.slice(1).map((row): AuditLogEntry => ({
    timestamp: row[0] || '',
    userId: row[1] || '',
    userName: row[2] || '',
    action: row[3] || '',
    targetId: row[4] || '',
    details: row[5] || '',
    ipAddress: row[6] || '',
  }));

  // Sort newest first
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return limit ? entries.slice(0, limit) : entries;
}
