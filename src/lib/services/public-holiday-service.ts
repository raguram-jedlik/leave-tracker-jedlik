// ============================================================================
// Public Holiday Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendToSheet, updateRowByColumnValue, deleteSheetRow, findRowIndex } from '@/lib/google-sheets';
import { PublicHoliday, SHEET_NAMES } from '@/lib/types';

const SHEET = SHEET_NAMES.PUBLIC_HOLIDAYS;

function parseHoliday(row: string[]): PublicHoliday {
  return {
    id: row[0] || '',
    name: row[1] || '',
    date: row[2] || '',
    description: row[3] || '',
    createdBy: row[4] || '',
    createdAt: row[5] || '',
    updatedAt: row[6] || '',
  };
}

function holidayToRow(h: PublicHoliday): string[] {
  return [h.id, h.name, h.date, h.description, h.createdBy, h.createdAt, h.updatedAt];
}

export async function getPublicHolidays(): Promise<PublicHoliday[]> {
  const data = await readSheet(SHEET);
  if (data.length <= 1) return [];
  return data.slice(1).map(parseHoliday);
}

export async function getPublicHolidayDates(): Promise<string[]> {
  const holidays = await getPublicHolidays();
  return holidays.map((h) => h.date);
}

export async function isPublicHoliday(date: string): Promise<boolean> {
  const dates = await getPublicHolidayDates();
  return dates.includes(date);
}

export async function createPublicHoliday(data: {
  name: string;
  date: string;
  description: string;
  createdBy: string;
}): Promise<PublicHoliday> {
  const now = new Date().toISOString();
  const holiday: PublicHoliday = {
    id: uuidv4(),
    name: data.name,
    date: data.date,
    description: data.description,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await appendToSheet(SHEET, [holidayToRow(holiday)]);
  return holiday;
}

export async function updatePublicHoliday(
  id: string,
  updates: { name?: string; date?: string; description?: string }
): Promise<PublicHoliday | null> {
  const holidays = await getPublicHolidays();
  const holiday = holidays.find((h) => h.id === id);
  if (!holiday) return null;

  const updated: PublicHoliday = {
    ...holiday,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const success = await updateRowByColumnValue(SHEET, 0, id, holidayToRow(updated));
  return success ? updated : null;
}

export async function deletePublicHoliday(id: string): Promise<boolean> {
  const index = await findRowIndex(SHEET, 0, id);
  if (index === -1) return false;

  await deleteSheetRow(SHEET, index);
  return true;
}
