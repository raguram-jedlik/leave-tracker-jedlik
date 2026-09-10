'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyLeaveBalance, getMyLeaveRequests } from '@/app/actions/leave-actions';
import { getPublicHolidaysList, getMyRegionalHolidays } from '@/app/actions/holiday-actions';
import { getDashboardData } from '@/app/actions/report-actions';
import { getPendingApprovals } from '@/app/actions/leave-actions';
import { getPendingRegionalHolidaysList } from '@/app/actions/holiday-actions';
import { StatusBadge } from '@/components/status-badge';
import { useSession } from '@/components/session-provider';
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Users,
  AlertCircle,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import type { LeaveBalance, LeaveRequest, PublicHoliday, RegionalHolidayRequest } from '@/lib/types';

export default function DashboardPage() {
  const user = useSession();
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin/Approver specific
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingRegional, setPendingRegional] = useState<RegionalHolidayRequest[]>([]);
  const [dashData, setDashData] = useState<{
    totalEmployees: number;
    pendingLeaveRequests: number;
    pendingRegionalHolidays: number;
    employeesOnLeaveToday: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [balRes, reqRes, holRes] = await Promise.all([
          getMyLeaveBalance(),
          getMyLeaveRequests(),
          getPublicHolidaysList(),
        ]);

        if (balRes.success && balRes.data) setBalance(balRes.data);
        if (reqRes.success && reqRes.data) setRequests(reqRes.data);
        if (holRes.success && holRes.data) setHolidays(holRes.data);

        // Load admin data if needed
        if (user.role === 'ADMIN' || user.role === 'APPROVER') {
          const [pendRes, regRes, dashRes] = await Promise.all([
            getPendingApprovals(),
            getPendingRegionalHolidaysList(),
            getDashboardData(),
          ]);
          if (pendRes.success && pendRes.data) setPendingLeaves(pendRes.data);
          if (regRes.success && regRes.data) setPendingRegional(regRes.data);
          if (dashRes.success && dashRes.data) setDashData(dashRes.data);
        }
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const upcomingHolidays = holidays.filter((h) => h.date >= today).slice(0, 5);
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const upcomingLeave = requests
    .filter((r) => r.status === 'APPROVED' && r.endDate >= today)
    .slice(0, 5);
  const recentHistory = requests.slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back, {user.name}</p>
      </div>

      {/* Admin/Approver Stats */}
      {(user.role === 'ADMIN' || user.role === 'APPROVER') && dashData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#ec1c24]" />
              <span className="stat-label">Employees</span>
            </div>
            <span className="stat-value">{dashData.totalEmployees}</span>
          </div>
          <Link href="/dashboard/approvals" className="stat-card hover:border-[#ec1c24]/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="stat-label">Pending Leave</span>
            </div>
            <span className="stat-value text-amber-600">{dashData.pendingLeaveRequests}</span>
          </Link>
          <Link href="/dashboard/regional-holidays" className="stat-card hover:border-[#ec1c24]/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span className="stat-label">Pending Regional</span>
            </div>
            <span className="stat-value text-blue-600">{dashData.pendingRegionalHolidays}</span>
          </Link>
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-green-500" />
              <span className="stat-label">On Leave Today</span>
            </div>
            <span className="stat-value">{dashData.employeesOnLeaveToday}</span>
          </div>
        </div>
      )}

      {/* Employee Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Main Cycle Card */}
        <div className="card col-span-1 md:col-span-2">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-500">Current Cycle</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                {balance?.currentCycle.label ?? '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                1 paid leave allowed per cycle (26th → 25th)
              </p>
            </div>
            <div className="p-2 rounded-lg bg-[#ec1c24]/10 shrink-0">
              <CalendarDays className="w-5 h-5 text-[#ec1c24]" />
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[11px] sm:text-xs text-gray-500">Paid leaves used this cycle</p>
            <p
              className={`text-2xl sm:text-3xl font-bold mt-1 ${
                balance?.cycleSlotUsed ? 'text-amber-600' : 'text-green-600'
              }`}
            >
              {balance?.cycleSlotUsed ? '1 / 1' : '0 / 1'}
            </p>
            {balance?.cycleSlotUsed && balance.cycleSlotUsedBy && (
              <p className="text-xs text-gray-500 mt-1">
                {balance.cycleSlotUsedBy.startDate} – {balance.cycleSlotUsedBy.endDate}{' '}
                ({balance.cycleSlotUsedBy.status.toLowerCase()})
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-500 mb-1">Quick Actions</p>
          <Link
            href="/dashboard/request-leave"
            className="btn btn-primary w-full"
          >
            <CalendarPlus className="w-4 h-4" />
            Request Leave
          </Link>
          <Link href="/dashboard/my-leaves" className="btn btn-outline w-full">
            <CalendarDays className="w-4 h-4" />
            View My Leaves
          </Link>
          <Link href="/dashboard/calendar" className="btn btn-outline w-full">
            <Calendar className="w-4 h-4" />
            View Calendar
          </Link>
        </div>
      </div>

      {/* Pending Approvals for Admin/Approver */}
      {(user.role === 'ADMIN' || user.role === 'APPROVER') && pendingLeaves.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Pending Leave Approvals</h2>
            <Link href="/dashboard/approvals" className="text-sm text-[#ec1c24] hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.slice(0, 5).map((req) => (
                  <tr key={req.id}>
                    <td className="font-medium">{req.employeeName}</td>
                    <td><StatusBadge status={req.leaveType} /></td>
                    <td className="text-xs">{formatDate(req.startDate)} – {formatDate(req.endDate)}</td>
                    <td>{req.numberOfDays}</td>
                    <td>
                      <Link href="/dashboard/approvals" className="text-sm text-[#ec1c24] hover:underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">My Pending Requests</h2>
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)}
                    </p>
                    <p className="text-xs text-gray-500">{req.numberOfDays} day(s) · {req.leaveType}</p>
                  </div>
                  <StatusBadge status="PENDING" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Approved Leave */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Upcoming Leave</h2>
          {upcomingLeave.length === 0 ? (
            <div className="empty-state py-6">
              <CalendarDays className="w-8 h-8 empty-state-icon mx-auto" />
              <p className="text-sm mt-2">No upcoming approved leave</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingLeave.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)}
                    </p>
                    <p className="text-xs text-gray-500">{req.numberOfDays} day(s) · {req.leaveType}</p>
                  </div>
                  <StatusBadge status="APPROVED" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Public Holidays */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Upcoming Public Holidays</h2>
          {upcomingHolidays.length === 0 ? (
            <div className="empty-state py-6">
              <Calendar className="w-8 h-8 empty-state-icon mx-auto" />
              <p className="text-sm mt-2">No upcoming public holidays</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingHolidays.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{h.name}</p>
                    <p className="text-xs text-gray-500">{formatDate(h.date)}</p>
                  </div>
                  <span className="badge badge-paid">Holiday</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Leave History</h2>
            <Link href="/dashboard/my-leaves" className="text-sm text-[#ec1c24] hover:underline">
              View All
            </Link>
          </div>
          {recentHistory.length === 0 ? (
            <div className="empty-state py-6">
              <Clock className="w-8 h-8 empty-state-icon mx-auto" />
              <p className="text-sm mt-2">No leave history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentHistory.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)}
                    </p>
                    <p className="text-xs text-gray-500">{req.numberOfDays} day(s) · {req.leaveType}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
