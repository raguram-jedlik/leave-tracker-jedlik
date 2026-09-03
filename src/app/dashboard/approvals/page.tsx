'use client';

import { useEffect, useState } from 'react';
import {
  getAllLeaveRequests,
  getPendingApprovals,
  approveLeave,
  rejectLeave,
} from '@/app/actions/leave-actions';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  Check,
  X,
  MessageSquare,
  Search,
} from 'lucide-react';
import type { LeaveRequest } from '@/lib/types';

export default function ApprovalsPage() {
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  
  // Action modal state
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    const res = await getAllLeaveRequests();
    if (res.success && res.data) {
      setRequests(res.data);
    } else {
      showToast('error', res.error || 'Failed to load requests');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openActionModal = (req: LeaveRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setActionType(type);
    setComment('');
  };

  const closeActionModal = () => {
    setSelectedRequest(null);
    setActionType(null);
    setComment('');
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;

    setSubmitting(true);
    try {
      let res;
      if (actionType === 'approve') {
        res = await approveLeave(selectedRequest.id, comment.trim());
      } else {
        res = await rejectLeave(selectedRequest.id, comment.trim());
      }

      if (res.success && res.data) {
        showToast('success', res.message || `Leave request ${actionType}d.`);
        setRequests((prev) =>
          prev.map((r) => (r.id === selectedRequest.id ? res.data! : r))
        );
        closeActionModal();
      } else {
        showToast('error', res.error || `Failed to ${actionType} request.`);
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const filteredRequests = requests.filter((r) => {
    const matchesFilter = filter === 'ALL' || r.status === filter;
    const matchesSearch =
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase()) ||
      r.leaveType.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Leave Approvals</h1>
          <p className="page-subtitle">Review and manage employee leave requests</p>
        </div>
        <button onClick={loadRequests} className="btn btn-outline self-start sm:self-auto">
          Refresh List
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div
          onClick={() => setFilter('PENDING')}
          className={`stat-card cursor-pointer transition-all ${
            filter === 'PENDING' ? 'border-[#ec1c24] ring-1 ring-[#ec1c24]/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Pending Reviews</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <span className="stat-value text-amber-600">{pendingCount}</span>
        </div>

        <div
          onClick={() => setFilter('APPROVED')}
          className={`stat-card cursor-pointer transition-all ${
            filter === 'APPROVED' ? 'border-[#ec1c24] ring-1 ring-[#ec1c24]/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Approved</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <span className="stat-value text-green-600">{approvedCount}</span>
        </div>

        <div
          onClick={() => setFilter('REJECTED')}
          className={`stat-card cursor-pointer transition-all ${
            filter === 'REJECTED' ? 'border-[#ec1c24] ring-1 ring-[#ec1c24]/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Rejected</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <span className="stat-value text-red-600">{rejectedCount}</span>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
            >
              {s === 'ALL' ? 'All Requests' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm w-full"
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="card empty-state py-12">
          <Clock className="w-12 h-12 empty-state-icon mx-auto" />
          <p className="mt-2 text-base font-medium text-gray-700">No requests found</p>
          <p className="text-xs text-gray-400">
            {filter === 'PENDING' ? 'All leave requests have been reviewed!' : 'No records match your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="table-container shadow-sm">
          <table className="table table-wide">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Reviewer Notes</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                  <td>
                    <span className="font-semibold text-gray-900">{req.employeeName}</span>
                  </td>
                  <td><StatusBadge status={req.leaveType} /></td>
                  <td className="whitespace-nowrap text-sm text-gray-700">
                    {formatDate(req.startDate)} – {formatDate(req.endDate)}
                  </td>
                  <td>
                    <span className="font-semibold text-gray-900">{req.numberOfDays}</span>
                    <span className="text-xs text-gray-500 ml-1">day{req.numberOfDays > 1 ? 's' : ''}</span>
                  </td>
                  <td className="max-w-[220px]">
                    <p className="truncate text-sm text-gray-700" title={req.reason}>
                      {req.reason}
                    </p>
                  </td>
                  <td><StatusBadge status={req.status} /></td>
                  <td className="whitespace-nowrap text-xs text-gray-500">
                    {formatDate(req.requestedAt)}
                  </td>
                  <td className="max-w-[180px]">
                    {req.reviewerComment ? (
                      <span className="text-xs text-gray-600 truncate block" title={req.reviewerComment}>
                        {req.reviewerComment}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {req.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openActionModal(req, 'approve')}
                          className="btn btn-sm btn-success"
                          title="Approve Request"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => openActionModal(req, 'reject')}
                          className="btn btn-sm btn-danger"
                          title="Reject Request"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {req.reviewedBy ? `by ${req.reviewedBy}` : 'Completed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve / Reject Modal */}
      {selectedRequest && actionType && (
        <div className="modal-overlay" onClick={closeActionModal}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {actionType === 'approve' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {actionType} Leave Request
                </h3>
              </div>
              <button onClick={closeActionModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3.5 mb-4 text-sm space-y-1.5 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee:</span>
                <span className="font-semibold text-gray-900">{selectedRequest.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Leave Type:</span>
                <span className="font-medium text-gray-900">{selectedRequest.leaveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration:</span>
                <span className="font-medium text-gray-900">
                  {formatDate(selectedRequest.startDate)} – {formatDate(selectedRequest.endDate)} ({selectedRequest.numberOfDays} days)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reason:</span>
                <span className="text-gray-700 italic max-w-[280px] text-right truncate">"{selectedRequest.reason}"</span>
              </div>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  Reviewer Notes / Comments {actionType === 'reject' ? '(Recommended)' : '(Optional)'}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    actionType === 'approve'
                      ? 'e.g., Approved. Handover covered.'
                      : 'e.g., Critical release milestone on these dates.'
                  }
                  className="textarea text-sm"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeActionModal}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${actionType === 'approve' ? 'btn-success' : 'btn-danger'}`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="spinner" />
                  ) : actionType === 'approve' ? (
                    'Confirm Approval'
                  ) : (
                    'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00+05:30');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
