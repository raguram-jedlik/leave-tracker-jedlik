// ============================================================================
// Jedlik Motors Leave Management System — Type Definitions
// ============================================================================

// --- User Roles ---
export type UserRole = 'ADMIN' | 'APPROVER' | 'EMPLOYEE';

// --- Leave Types ---
export type LeaveType = 'PAID' | 'UNPAID';

// --- Leave Request Status ---
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// --- Regional Holiday Decision ---
export type RegionalHolidayStatus = 'PENDING' | 'APPROVED_PAID' | 'APPROVED_UNPAID' | 'REJECTED';

// --- Employee ---
export interface Employee {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  startDate: string; // YYYY-MM-DD — for leave entitlement calculation
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  startDate: string;
  createdAt: string;
}

// --- Leave Request ---
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  numberOfDays: number;
  reason: string;
  status: LeaveStatus;
  requestedAt: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewerComment: string;
}

// --- Public Holiday ---
export interface PublicHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// --- Leave Ledger Entry ---
export interface LeaveLedgerEntry {
  employeeId: string;
  year: number;
  month: number;
  monthlyEntitlement: number;
  notes: string;
}

// --- Regional Holiday Request ---
export interface RegionalHolidayRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  holidayName: string;
  date: string; // YYYY-MM-DD
  reason: string;
  status: RegionalHolidayStatus;
  requestedAt: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewerComment: string;
}

// --- Audit Log Entry ---
export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  targetId: string;
  details: string;
  ipAddress: string;
}

// --- Settings ---
export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string;
}

// --- Leave Balance ---
export interface LeaveBalance {
  totalEntitlement: number;
  approvedPaidLeave: number;
  pendingReserved: number;
  availableBalance: number;
  unreservedBalance: number;
}

export interface MonthlyBreakdown {
  year: number;
  month: number;
  monthName: string;
  openingBalance: number;
  entitlement: number;
  approvedUsed: number;
  pendingReserved: number;
  closingBalance: number;
}

// --- Session User (for NextAuth) ---
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

// --- API Response ---
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// --- Form Data Types ---
export interface LeaveRequestFormData {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface RegionalHolidayFormData {
  holidayName: string;
  date: string;
  reason: string;
}

export interface EmployeeFormData {
  name: string;
  email: string;
  role: UserRole;
  startDate: string;
  temporaryPassword: string;
}

export interface PublicHolidayFormData {
  name: string;
  date: string;
  description: string;
}

// --- Audit Actions ---
export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  LEAVE_REQUESTED: 'LEAVE_REQUESTED',
  LEAVE_APPROVED: 'LEAVE_APPROVED',
  LEAVE_REJECTED: 'LEAVE_REJECTED',
  LEAVE_CANCELLED: 'LEAVE_CANCELLED',
  REGIONAL_HOLIDAY_REQUESTED: 'REGIONAL_HOLIDAY_REQUESTED',
  REGIONAL_HOLIDAY_APPROVED_PAID: 'REGIONAL_HOLIDAY_APPROVED_PAID',
  REGIONAL_HOLIDAY_APPROVED_UNPAID: 'REGIONAL_HOLIDAY_APPROVED_UNPAID',
  REGIONAL_HOLIDAY_REJECTED: 'REGIONAL_HOLIDAY_REJECTED',
  PUBLIC_HOLIDAY_ADDED: 'PUBLIC_HOLIDAY_ADDED',
  PUBLIC_HOLIDAY_EDITED: 'PUBLIC_HOLIDAY_EDITED',
  PUBLIC_HOLIDAY_DELETED: 'PUBLIC_HOLIDAY_DELETED',
  EMPLOYEE_ADDED: 'EMPLOYEE_ADDED',
  EMPLOYEE_UPDATED: 'EMPLOYEE_UPDATED',
  EMPLOYEE_DEACTIVATED: 'EMPLOYEE_DEACTIVATED',
  EMPLOYEE_REACTIVATED: 'EMPLOYEE_REACTIVATED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
} as const;

// --- Settings Keys ---
export const SETTINGS_KEYS = {
  MONTHLY_ENTITLEMENT: 'monthly_entitlement',
  CARRY_FORWARD_ENABLED: 'carry_forward_enabled',
  MAX_CARRY_FORWARD: 'max_carry_forward',
} as const;

// --- Sheet Names ---
export const SHEET_NAMES = {
  EMPLOYEES: 'Employees',
  LEAVE_REQUESTS: 'Leave Requests',
  PUBLIC_HOLIDAYS: 'Public Holidays',
  LEAVE_LEDGER: 'Leave Ledger',
  REGIONAL_HOLIDAY_REQUESTS: 'Regional Holiday Requests',
  AUDIT_LOG: 'Audit Log',
  SETTINGS: 'Settings',
} as const;

// --- Sheet Column Headers ---
export const SHEET_HEADERS = {
  EMPLOYEES: [
    'Employee ID', 'Name', 'Email', 'Password Hash', 'Role',
    'Active', 'Must Change Password', 'Start Date', 'Created At', 'Updated At',
  ],
  LEAVE_REQUESTS: [
    'Request ID', 'Employee ID', 'Employee Name', 'Leave Type',
    'Start Date', 'End Date', 'Number of Days', 'Reason', 'Status',
    'Requested At', 'Reviewed By', 'Reviewed At', 'Reviewer Comment',
  ],
  PUBLIC_HOLIDAYS: [
    'Holiday ID', 'Holiday Name', 'Date', 'Description',
    'Created By', 'Created At', 'Updated At',
  ],
  LEAVE_LEDGER: [
    'Employee ID', 'Year', 'Month', 'Monthly Entitlement', 'Notes',
  ],
  REGIONAL_HOLIDAY_REQUESTS: [
    'Request ID', 'Employee ID', 'Employee Name', 'Holiday Name',
    'Date', 'Reason', 'Status', 'Requested At',
    'Reviewed By', 'Reviewed At', 'Reviewer Comment',
  ],
  AUDIT_LOG: [
    'Timestamp', 'User ID', 'User Name', 'Action',
    'Target ID', 'Details', 'IP Address',
  ],
  SETTINGS: [
    'Key', 'Value', 'Updated At', 'Updated By',
  ],
} as const;
