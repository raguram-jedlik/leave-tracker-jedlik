/**
 * ============================================================================
 * Seed Script — Create sheet tabs and the first admin user
 * ============================================================================
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * This script will:
 *   1. Create all required sheet tabs (if they don't exist)
 *   2. Create an admin user with email: admin@jedlik.com / password: admin123
 *
 * You MUST fill in your Google credentials in .env.local before running this.
 * ============================================================================
 */

import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ── Load environment variables from .env.local ──────────
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.error('❌ Could not read .env.local — make sure it exists.');
    process.exit(1);
  }
}

loadEnv();

// ── Config ──────────────────────────────────────────────

const ADMIN_EMAIL = 'admin@jedlik.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Admin User';

const SHEET_TABS: Record<string, string[]> = {
  'Employees': [
    'Employee ID', 'Name', 'Email', 'Password Hash', 'Role',
    'Active', 'Must Change Password', 'Start Date', 'Created At', 'Updated At',
  ],
  'Leave Requests': [
    'Request ID', 'Employee ID', 'Employee Name', 'Leave Type',
    'Start Date', 'End Date', 'Number of Days', 'Reason', 'Status',
    'Requested At', 'Reviewed By', 'Reviewed At', 'Reviewer Comment',
  ],
  'Public Holidays': [
    'Holiday ID', 'Holiday Name', 'Date', 'Description',
    'Created By', 'Created At', 'Updated At',
  ],
  'Leave Ledger': [
    'Employee ID', 'Year', 'Month', 'Monthly Entitlement', 'Notes',
  ],
  'Regional Holiday Requests': [
    'Request ID', 'Employee ID', 'Employee Name', 'Holiday Name',
    'Date', 'Reason', 'Status', 'Requested At',
    'Reviewed By', 'Reviewed At', 'Reviewer Comment',
  ],
  'Audit Log': [
    'Timestamp', 'User ID', 'User Name', 'Action',
    'Target ID', 'Details', 'IP Address',
  ],
  'Settings': [
    'Key', 'Value', 'Updated At', 'Updated By',
  ],
};

// ── Main ────────────────────────────────────────────────

async function main() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
    console.error('❌ Missing required environment variables.');
    console.error('   Fill in GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID in .env.local');
    process.exit(1);
  }

  console.log('🔗 Connecting to Google Sheets...');

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get existing sheet tabs
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTabs = new Set(
    spreadsheet.data.sheets?.map((s) => s.properties?.title) || []
  );

  // Create missing sheet tabs
  console.log('\n📋 Setting up sheet tabs...');

  for (const [tabName, headers] of Object.entries(SHEET_TABS)) {
    if (existingTabs.has(tabName)) {
      console.log(`   ✅ "${tabName}" already exists`);
    } else {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }],
        },
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabName}'!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });

      console.log(`   ✨ Created "${tabName}"`);
    }
  }

  // Check if admin already exists
  console.log('\n👤 Setting up admin user...');

  const employeeData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Employees',
  });

  const rows = employeeData.data.values || [];
  const adminExists = rows.some(
    (row) => row[2]?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  if (adminExists) {
    console.log(`   ✅ Admin user (${ADMIN_EMAIL}) already exists`);
  } else {
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const adminRow = [
      uuidv4(),           // Employee ID
      ADMIN_NAME,         // Name
      ADMIN_EMAIL,        // Email
      passwordHash,       // Password Hash
      'ADMIN',            // Role
      'TRUE',             // Active
      'TRUE',             // Must Change Password
      '2024-01-01',       // Start Date
      now,                // Created At
      now,                // Updated At
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Employees',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [adminRow] },
    });

    console.log(`   ✨ Created admin user`);
    console.log(`      Email:    ${ADMIN_EMAIL}`);
    console.log(`      Password: ${ADMIN_PASSWORD}`);
  }

  // Seed default settings
  console.log('\n⚙️  Setting up defaults...');

  const settingsData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Settings',
  });

  const settingsRows = settingsData.data.values || [];
  const existingKeys = new Set(settingsRows.slice(1).map((r) => r[0]));

  const defaultSettings = [
    ['monthly_entitlement', '1.5', new Date().toISOString(), 'SYSTEM'],
    ['carry_forward_enabled', 'false', new Date().toISOString(), 'SYSTEM'],
    ['max_carry_forward', '5', new Date().toISOString(), 'SYSTEM'],
  ];

  const newSettings = defaultSettings.filter((s) => !existingKeys.has(s[0]));

  if (newSettings.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Settings',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: newSettings },
    });
    console.log(`   ✨ Added ${newSettings.length} default settings`);
  } else {
    console.log('   ✅ Settings already configured');
  }

  console.log('\n🎉 Setup complete! Run the app with: npm run dev\n');
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
