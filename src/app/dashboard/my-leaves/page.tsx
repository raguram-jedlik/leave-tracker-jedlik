'use client';

import { useEffect, useState } from 'react';
import { getMyLeaveRequests, cancelMyLeaveRequest } from '@/app/actions/leave-actions';
import { getMyRegionalHolidays } from '@/app/actions/holiday-actions';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog';
import { CalendarDays, X } from 'lucide-react';
import type { LeaveRequest, RegionalHolidayRequest } from '@/lib/types';

export default function MyLeavesPage() {
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [regionals, setRegionals] = useState<RegionalHolidayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [tab, setTab] = useState<'leave' | 'regional'>('leave');

  useEffect(() => {
    async function load() {
      const [reqRes, regRes] = await Promise.all([
        getMyLeaveRequests(),
        getMyRegionalHolidays(),
      ]);
      if (reqRes.success && reqRes.data) setRequests(reqRes.data);
      if (regRes.success && regRes.data) setRegionals(regRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const handleCancel = async (id: string) => {
    const ok = await confirm({
      title: 'Cancel Leave Request',
      message: 'Are you sure you want to cancel this leave request?',
      confirmLabel: 'Cancel Request',
      variant: 'danger',
    });
    if (!ok) return;

    const result = await cancelMyLeaveRequest(id);
    if (result.success) {
      showToast('success', 'Leave request cancelled.');
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' as const } : r))
      );
    } else {
      showToast('error', result.error || 'Failed to cancel.');
    }
  };

  const filteredRequests = filter === 'ALL'
    ? requests
    : requests.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Leaves</h1>
        <p className="page-subtitle">View all your leave requests and regional holiday requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('leave')}
          className={`btn ${tab === 'leave' ? 'btn-primary' : 'btn-outline'}`}
        >
          Leave Requests ({requests.length})
        </button>
        <button
          onClick={() => setTab('regional')}
          className={`btn ${tab === 'regional' ? 'btn-primary' : 'btn-outline'}`}
        >
          Regional Holidays ({regionals.length})
        </button>
      </div>

      {tab === 'leave' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Leave Requests Table */}
          {filteredRequests.length === 0 ? (
            <div className="card empty-state">
              <CalendarDays className="w-10 h-10 empty-state-icon mx-auto" />
              <p className="mt-2">No leave requests found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table table-wide">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Comments</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.id}>
                      <td><StatusBadge status={req.leaveType} /></td>
                      <td className="whitespace-nowrap">{formatDate(req.startDate)}</td>
                      <td className="whitespace-nowrap">{formatDate(req.endDate)}</td>
                      <td>{req.numberOfDays}</td>
                      <td className="max-w-[200px] truncate">{req.reason}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td>{req.reviewedBy || '—'}</td>
                      <td className="max-w-[200px] truncate">{req.reviewerComment || '—'}</td>
                      <td>
                        {req.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            className="btn btn-sm btn-danger"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'regional' && (
        <>
          {regionals.length === 0 ? (
            <div className="card empty-state">
              <CalendarDays className="w-10 h-10 empty-state-icon mx-auto" />
              <p className="mt-2">No regional holiday requests</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Holiday</th>
                    <th>Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {regionals.map((req) => (
                    <tr key={req.id}>
                      <td className="font-medium">{req.holidayName}</td>
                      <td className="whitespace-nowrap">{formatDate(req.date)}</td>
                      <td className="max-w-[200px] truncate">{req.reason}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td>{req.reviewedBy || '—'}</td>
                      <td className="max-w-[200px] truncate">{req.reviewerComment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
