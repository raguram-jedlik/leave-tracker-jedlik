'use client';

import { useEffect, useState } from 'react';
import { getReportData } from '@/app/actions/report-actions';
import { useToast } from '@/components/toast-provider';
import {
  BarChart3,
  Users,
  CalendarDays,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Download,
  Search,
} from 'lucide-react';

interface ReportData {
  totalEmployees: number;
  activeEmployees: number;
  totalLeaveRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalPaidDaysUsed: number;
  totalUnpaidDaysUsed: number;
  employeeBalances: { name: string; available: number; used: number; pending: number }[];
  monthlyUsage: { month: string; paid: number; unpaid: number }[];
  pendingRegionalHolidays: number;
}

export default function ReportsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchEmp, setSearchEmp] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await getReportData();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      showToast('error', res.error || 'Failed to load report data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const exportCSV = () => {
    if (!data) return;
    const headers = ['Employee Name', 'Available Balance (Days)', 'Used (Days)', 'Pending Reserved (Days)'];
    const rows = data.employeeBalances.map((e) => [
      `"${e.name.replace(/"/g, '""')}"`,
      e.available,
      e.used,
      e.pending,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `jedlik_leave_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Report CSV downloaded.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card empty-state py-12">
        <BarChart3 className="w-12 h-12 empty-state-icon mx-auto" />
        <p className="mt-2 text-base font-medium text-gray-700">Unable to generate report</p>
      </div>
    );
  }

  const filteredBalances = data.employeeBalances.filter((e) =>
    e.name.toLowerCase().includes(searchEmp.toLowerCase())
  );

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Organizational leave trends, usage breakdown, and employee balance balances</p>
        </div>
        <button onClick={exportCSV} className="btn btn-outline self-start sm:self-auto">
          <Download className="w-4 h-4" />
          Export Balances (CSV)
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Active Team</span>
            <Users className="w-4 h-4 text-gray-500" />
          </div>
          <span className="stat-value">{data.activeEmployees}</span>
          <span className="text-xs text-gray-400 mt-1 block">of {data.totalEmployees} total registered</span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Paid Days Taken</span>
            <TrendingUp className="w-4 h-4 text-[#ec1c24]" />
          </div>
          <span className="stat-value text-[#ec1c24]">{data.totalPaidDaysUsed}</span>
          <span className="text-xs text-gray-400 mt-1 block">Approved paid days</span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Pending Requests</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="stat-value text-amber-600">{data.pendingRequests}</span>
          <span className="text-xs text-gray-400 mt-1 block">+{data.pendingRegionalHolidays} regional</span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Unpaid Days</span>
            <CalendarDays className="w-4 h-4 text-blue-500" />
          </div>
          <span className="stat-value text-blue-600">{data.totalUnpaidDaysUsed}</span>
          <span className="text-xs text-gray-400 mt-1 block">Approved unpaid days</span>
        </div>
      </div>

      {/* Summary Charts / Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Trend */}
        <div className="card lg:col-span-1">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Monthly Leave Usage</h2>
          {data.monthlyUsage.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No monthly historical data yet</p>
          ) : (
            <div className="space-y-3">
              {data.monthlyUsage.map((m) => (
                <div key={m.month} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-800">{m.month}</span>
                    <span className="text-xs font-bold text-gray-900">{m.paid + m.unpaid} days</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="text-green-700 font-medium">Paid: {m.paid}d</span>
                    <span className="text-blue-700 font-medium">Unpaid: {m.unpaid}d</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Requests Status Distribution */}
        <div className="card lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-900">Employee Balances Overview</h2>
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter employee..."
                value={searchEmp}
                onChange={(e) => setSearchEmp(e.target.value)}
                className="input pl-9 text-xs w-full py-1.5"
              />
            </div>
          </div>

          <div className="table-container max-h-[360px] overflow-y-auto shadow-sm">
            <table className="table table-wide">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th>Employee</th>
                  <th className="text-right">Available Balance</th>
                  <th className="text-right">Used Days</th>
                  <th className="text-right">Reserved (Pending)</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="font-medium text-gray-900">{emp.name}</td>
                    <td className="text-right">
                      <span className="font-bold text-gray-900">{emp.available}</span>
                      <span className="text-xs text-gray-500 ml-1">days</span>
                    </td>
                    <td className="text-right text-gray-600">{emp.used} days</td>
                    <td className="text-right">
                      {emp.pending > 0 ? (
                        <span className="text-amber-600 font-semibold">{emp.pending} days</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
