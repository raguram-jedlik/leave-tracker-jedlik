// ============================================================================
// Employee Service — CRUD operations for employees in Google Sheets
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { readSheet, appendToSheet, updateRowByColumnValue } from '@/lib/google-sheets';
import { Employee, EmployeePublic, SHEET_NAMES } from '@/lib/types';

const SHEET = SHEET_NAMES.EMPLOYEES;
const SALT_ROUNDS = 12;

/**
 * Parse a row of sheet data into an Employee object.
 */
function parseEmployee(row: string[]): Employee {
  return {
    id: row[0] || '',
    name: row[1] || '',
    email: row[2] || '',
    passwordHash: row[3] || '',
    role: (row[4] as Employee['role']) || 'EMPLOYEE',
    active: row[5] === 'TRUE',
    mustChangePassword: row[6] === 'TRUE',
    startDate: row[7] || '',
    createdAt: row[8] || '',
    updatedAt: row[9] || '',
  };
}

/**
 * Convert an Employee to a row for Google Sheets.
 */
function employeeToRow(emp: Employee): string[] {
  return [
    emp.id,
    emp.name,
    emp.email,
    emp.passwordHash,
    emp.role,
    emp.active ? 'TRUE' : 'FALSE',
    emp.mustChangePassword ? 'TRUE' : 'FALSE',
    emp.startDate,
    emp.createdAt,
    emp.updatedAt,
  ];
}

/**
 * Strip sensitive fields from an employee for public use.
 */
function toPublic(emp: Employee): EmployeePublic {
  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    role: emp.role,
    active: emp.active,
    startDate: emp.startDate,
    createdAt: emp.createdAt,
  };
}

/**
 * Get all employees.
 */
export async function getEmployees(): Promise<Employee[]> {
  const data = await readSheet(SHEET);
  if (data.length <= 1) return []; // Only headers or empty
  return data.slice(1).map(parseEmployee);
}

/**
 * Get all employees (public info only).
 */
export async function getEmployeesPublic(): Promise<EmployeePublic[]> {
  const employees = await getEmployees();
  return employees.map(toPublic);
}

/**
 * Get active employees (public info only).
 */
export async function getActiveEmployeesPublic(): Promise<EmployeePublic[]> {
  const employees = await getEmployees();
  return employees.filter((e) => e.active).map(toPublic);
}

/**
 * Get an employee by ID.
 */
export async function getEmployeeById(id: string): Promise<Employee | null> {
  const employees = await getEmployees();
  return employees.find((e) => e.id === id) || null;
}

/**
 * Get an employee by email.
 */
export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  const employees = await getEmployees();
  return employees.find((e) => e.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Create a new employee with a hashed password.
 */
export async function createEmployee(data: {
  name: string;
  email: string;
  role: Employee['role'];
  password: string;
  startDate: string;
}): Promise<EmployeePublic> {
  // Check for duplicate email
  const existing = await getEmployeeByEmail(data.email);
  if (existing) {
    throw new Error('An employee with this email already exists.');
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const employee: Employee = {
    id: uuidv4(),
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    role: data.role,
    active: true,
    mustChangePassword: true,
    startDate: data.startDate,
    createdAt: now,
    updatedAt: now,
  };

  await appendToSheet(SHEET, [employeeToRow(employee)]);
  return toPublic(employee);
}

/**
 * Update an employee's information.
 */
export async function updateEmployee(
  id: string,
  updates: Partial<Pick<Employee, 'name' | 'email' | 'role' | 'active' | 'startDate'>>
): Promise<EmployeePublic | null> {
  const employee = await getEmployeeById(id);
  if (!employee) return null;

  // If email is changing, check for duplicates
  if (updates.email && updates.email.toLowerCase() !== employee.email.toLowerCase()) {
    const existing = await getEmployeeByEmail(updates.email);
    if (existing) {
      throw new Error('An employee with this email already exists.');
    }
  }

  const updated: Employee = {
    ...employee,
    ...updates,
    email: updates.email ? updates.email.toLowerCase() : employee.email,
    updatedAt: new Date().toISOString(),
  };

  const success = await updateRowByColumnValue(SHEET, 0, id, employeeToRow(updated));
  if (!success) return null;

  return toPublic(updated);
}

/**
 * Deactivate an employee (soft delete).
 */
export async function deactivateEmployee(id: string): Promise<boolean> {
  const result = await updateEmployee(id, { active: false });
  return result !== null;
}

/**
 * Reactivate an employee.
 */
export async function reactivateEmployee(id: string): Promise<boolean> {
  const result = await updateEmployee(id, { active: true });
  return result !== null;
}

/**
 * Reset an employee's password.
 */
export async function resetEmployeePassword(
  id: string,
  newPassword: string
): Promise<boolean> {
  const employee = await getEmployeeById(id);
  if (!employee) return false;

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const updated: Employee = {
    ...employee,
    passwordHash,
    mustChangePassword: true,
    updatedAt: new Date().toISOString(),
  };

  return await updateRowByColumnValue(SHEET, 0, id, employeeToRow(updated));
}

/**
 * Change an employee's password (self-service).
 */
export async function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const employee = await getEmployeeById(id);
  if (!employee) return false;

  const isValid = await bcrypt.compare(currentPassword, employee.passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect.');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const updated: Employee = {
    ...employee,
    passwordHash,
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  };

  return await updateRowByColumnValue(SHEET, 0, id, employeeToRow(updated));
}

/**
 * Validate login credentials.
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<Employee | null> {
  const employee = await getEmployeeByEmail(email);
  if (!employee) return null;
  if (!employee.active) return null;

  const isValid = await bcrypt.compare(password, employee.passwordHash);
  if (!isValid) return null;

  return employee;
}
