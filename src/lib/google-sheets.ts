// ============================================================================
// Google Sheets Service — Authenticated connection and CRUD operations
// ============================================================================

import { google, sheets_v4 } from 'googleapis';

let sheetsInstance: sheets_v4.Sheets | null = null;

/**
 * Get an authenticated Google Sheets API client.
 * Uses a service account with credentials from environment variables.
 */
function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsInstance) return sheetsInstance;

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error(
      'Missing Google Sheets credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in your environment variables.'
    );
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsInstance = google.sheets({ version: 'v4', auth });
  return sheetsInstance;
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error('Missing GOOGLE_SHEET_ID environment variable.');
  }
  return id;
}

/**
 * Read all rows from a sheet tab.
 * Returns an array of string arrays (each row is an array of cell values).
 * First row is headers.
 */
export async function readSheet(sheetName: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });

    return (response.data.values as string[][]) || [];
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 400 && err.message?.includes('Unable to parse range')) {
      // Sheet tab doesn't exist yet
      return [];
    }
    console.error(`Error reading sheet "${sheetName}":`, error);
    throw new Error(`Unable to read data from ${sheetName}. Please try again later.`);
  }
}

/**
 * Append rows to a sheet tab.
 */
export async function appendToSheet(
  sheetName: string,
  rows: (string | number | boolean)[][]
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows,
      },
    });
  } catch (error) {
    console.error(`Error appending to sheet "${sheetName}":`, error);
    throw new Error(`Unable to save data. Please try again later.`);
  }
}

/**
 * Update a specific cell range in a sheet.
 */
export async function updateSheetRange(
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error(`Error updating range "${range}":`, error);
    throw new Error(`Unable to update data. Please try again later.`);
  }
}

/**
 * Delete a row from a sheet by row index (0-based, excluding header).
 */
export async function deleteSheetRow(
  sheetName: string,
  rowIndex: number
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    // Get the sheet ID (gid) first
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
      throw new Error(`Sheet "${sheetName}" not found.`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex + 1, // +1 for header row
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error(`Error deleting row ${rowIndex} from "${sheetName}":`, error);
    throw new Error(`Unable to delete data. Please try again later.`);
  }
}

/**
 * Create a new sheet tab with headers if it doesn't exist.
 */
export async function ensureSheetTab(
  sheetName: string,
  headers: string[]
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );

    if (!existingSheet) {
      // Create the sheet tab
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });
    }
  } catch (error) {
    console.error(`Error ensuring sheet tab "${sheetName}":`, error);
    throw error;
  }
}

/**
 * Find a row index (0-based, data rows excluding header) where a column matches a value.
 */
export async function findRowIndex(
  sheetName: string,
  columnIndex: number,
  value: string
): Promise<number> {
  const data = await readSheet(sheetName);
  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    if (data[i][columnIndex] === value) {
      return i - 1; // Return 0-based data row index
    }
  }
  return -1;
}

/**
 * Update a specific row by finding it by column value.
 * Returns true if found and updated, false if not found.
 */
export async function updateRowByColumnValue(
  sheetName: string,
  searchColumnIndex: number,
  searchValue: string,
  newRowData: (string | number | boolean)[]
): Promise<boolean> {
  const data = await readSheet(sheetName);

  for (let i = 1; i < data.length; i++) {
    if (data[i][searchColumnIndex] === searchValue) {
      const rowNumber = i + 1; // 1-based for Sheets API
      const range = `'${sheetName}'!A${rowNumber}`;
      await updateSheetRange(range, [newRowData]);
      return true;
    }
  }

  return false;
}
