// ============================================================================
// Settings Service — Manage application settings in Google Sheets
// ============================================================================

import { readSheet, appendToSheet, updateRowByColumnValue } from '@/lib/google-sheets';
import { Setting, SHEET_NAMES } from '@/lib/types';

const SHEET = SHEET_NAMES.SETTINGS;

function parseSetting(row: string[]): Setting {
  return {
    key: row[0] || '',
    value: row[1] || '',
    updatedAt: row[2] || '',
    updatedBy: row[3] || '',
  };
}

/**
 * Get all settings.
 */
export async function getSettings(): Promise<Setting[]> {
  const data = await readSheet(SHEET);
  if (data.length <= 1) return [];
  return data.slice(1).map(parseSetting);
}

/**
 * Get a specific setting by key.
 */
export async function getSetting(key: string): Promise<string | null> {
  const settings = await getSettings();
  const setting = settings.find((s) => s.key === key);
  return setting ? setting.value : null;
}

/**
 * Update a setting. Creates it if it doesn't exist.
 */
export async function updateSetting(
  key: string,
  value: string,
  updatedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  const row = [key, value, now, updatedBy];

  const updated = await updateRowByColumnValue(SHEET, 0, key, row);
  if (!updated) {
    // Setting doesn't exist yet, create it
    await appendToSheet(SHEET, [row]);
  }
}
