// ============================================================================
// Audit & Report Server Actions
// ============================================================================

'use server';

import { auth } from '@/lib/auth';
import { getAuditLogs } from '@/lib/services/audit-service';
import { getLeaveRequests } from '@/lib/services/leave-service';
import { getEmployees } from '@/lib/services/employee-service';
import { getEmployeeLedger } from '@/lib/services/leave-ledger-service';
import { calculateLeaveBalance } from '@/lib/services/leave-calculation';
import { getRegionalHolidayRequests } from '@/lib/services/regional-holiday-service';
import { getSettings, updateSetting } from '@/lib/services/settings-service';
import { writeAuditLog } from '@/lib/services/audit-service';
import { AuditLogEntry, ApiResponse, Setting, AUDIT_ACTIONS } from '@/lib/types';

export async function getAuditLogEntries(
  limit?: number
): Promise<ApiResponse<AuditLogEntry[]>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can view audit logs.' };
  }

  try {
    const logs = await getAuditLogs(limit);
    return { success: true, data: logs };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return { success: false, error: 'Unable to load audit logs.' };
  }
}

export async function getReportData(): Promise<ApiResponse<{
  totalEmployees: number;
  activeEmployees: number;
  totalLeaveRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalPaidDaysUsed: number;
  totalUnpaidDaysUsed: number;
  employeeBalances: { name: string; cycleSlotUsed: boolean }[];
  monthlyUsage: { month: string; paid: number; unpaid: number }[];
  pendingRegionalHolidays: number;
}>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can view reports.' };
  }

  try {
    const employees = await getEmployees();
    const leaveRequests = await getLeaveRequests();
    const regionalHolidays = await getRegionalHolidayRequests();

    const activeEmployees = employees.filter((e) => e.active);
    const approvedRequests = leaveRequests.filter((r) => r.status === 'APPROVED');
    const pendingRequests = leaveRequests.filter((r) => r.status === 'PENDING');
    const rejectedRequests = leaveRequests.filter((r) => r.status === 'REJECTED');

    const totalPaidDaysUsed = approvedRequests
      .filter((r) => r.leaveType === 'PAID')
      .reduce((sum, r) => sum + r.numberOfDays, 0);

    const totalUnpaidDaysUsed = approvedRequests
      .filter((r) => r.leaveType === 'UNPAID')
      .reduce((sum, r) => sum + r.numberOfDays, 0);

    // Employee balances
    const employeeBalances = await Promise.all(
      activeEmployees.map(async (emp) => {
        const empRequests = leaveRequests.filter((r) => r.employeeId === emp.id);
        const balance = await calculateLeaveBalance(empRequests);
        return {
          name: emp.name,
          cycleSlotUsed: balance.cycleSlotUsed,
        };
      })
    );

    // Monthly usage
    const monthlyUsage: Record<string, { paid: number; unpaid: number }> = {};
    for (const req of approvedRequests) {
      const month = req.startDate.substring(0, 7); // YYYY-MM
      if (!monthlyUsage[month]) monthlyUsage[month] = { paid: 0, unpaid: 0 };
      if (req.leaveType === 'PAID') {
        monthlyUsage[month].paid += req.numberOfDays;
      } else {
        monthlyUsage[month].unpaid += req.numberOfDays;
      }
    }

    const monthlyUsageArray = Object.entries(monthlyUsage)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const pendingRegionalHolidays = regionalHolidays.filter(
      (r) => r.status === 'PENDING'
    ).length;

    return {
      success: true,
      data: {
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        totalLeaveRequests: leaveRequests.length,
        pendingRequests: pendingRequests.length,
        approvedRequests: approvedRequests.length,
        rejectedRequests: rejectedRequests.length,
        totalPaidDaysUsed,
        totalUnpaidDaysUsed,
        employeeBalances,
        monthlyUsage: monthlyUsageArray,
        pendingRegionalHolidays,
      },
    };
  } catch (error) {
    console.error('Error generating report:', error);
    return { success: false, error: 'Unable to generate report.' };
  }
}

export async function getSettingsList(): Promise<ApiResponse<Setting[]>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can view settings.' };
  }

  try {
    const settings = await getSettings();
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { success: false, error: 'Unable to load settings.' };
  }
}

export async function updateSettingAction(
  key: string,
  value: string
): Promise<ApiResponse> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can update settings.' };
  }

  try {
    await updateSetting(key, value, session.user.name);

    await writeAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      details: `${key} = ${value}`,
    });

    return { success: true, message: 'Setting updated.' };
  } catch (error) {
    console.error('Error updating setting:', error);
    return { success: false, error: 'Failed to update setting.' };
  }
}

/**
 * Dashboard data for admin/approver view.
 */
export async function getDashboardData(): Promise<ApiResponse<{
  totalEmployees: number;
  pendingLeaveRequests: number;
  pendingRegionalHolidays: number;
  employeesOnLeaveToday: number;
  upcomingHolidaysCount: number;
  totalPaidLeaveUsed: number;
}>> {
  const session = await auth();
  if (!session?.user) return { success: false, error: 'Not authenticated.' };

  try {
    const employees = await getEmployees();
    const leaveRequests = await getLeaveRequests();
    const regionalHolidays = await getRegionalHolidayRequests();

    const today = new Date().toISOString().split('T')[0];
    const activeEmployees = employees.filter((e) => e.active);
    const pendingLeave = leaveRequests.filter((r) => r.status === 'PENDING');
    const pendingRegional = regionalHolidays.filter((r) => r.status === 'PENDING');

    const onLeaveToday = leaveRequests.filter(
      (r) => r.status === 'APPROVED' && r.startDate <= today && r.endDate >= today
    );

    const totalPaidUsed = leaveRequests
      .filter((r) => r.status === 'APPROVED' && r.leaveType === 'PAID')
      .reduce((sum, r) => sum + r.numberOfDays, 0);

    return {
      success: true,
      data: {
        totalEmployees: activeEmployees.length,
        pendingLeaveRequests: pendingLeave.length,
        pendingRegionalHolidays: pendingRegional.length,
        employeesOnLeaveToday: onLeaveToday.length,
        upcomingHolidaysCount: 0, // Will be set by public holidays
        totalPaidLeaveUsed: totalPaidUsed,
      },
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return { success: false, error: 'Unable to load dashboard data.' };
  }
}
