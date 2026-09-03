'use client';

import { useEffect, useState } from 'react';
import {
  getAllRegionalHolidays,
  approveRegionalPaid,
  approveRegionalUnpaid,
  rejectRegionalHolidayAction,
  submitRegionalHoliday,
} from '@/app/actions/holiday-actions';
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/components/toast-provider';
import { ConfirmDialog, useConfirmDialog } from '@/components/confirm-dialog';
import {
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  X,
  MessageSquare,
  Search,
  Award,
} from 'lucide-react';
import type { RegionalHolidayRequest } from '@/lib/types';

export default function RegionalHolidaysPage() {
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();
  const [requests, setRequests] = useState<RegionalHolidayRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED_PAID' | 'APPROVED_UNPAID' | 'REJECTED' | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');

  // Action review modal
  const [selectedReq, setSelectedReq] = useState<RegionalHolidayRequest | null>(null);
  const [actionType, setActionType] = useState<'paid' | 'unpaid' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Request Modal (for self or reference)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    const res = await getAllRegionalHolidays();
    if (res.success && res.data) {
      setRequests(res.data);
    } else {
      showToast('error', res.error || 'Failed to load regional holiday requests.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openActionModal = (req: RegionalHolidayRequest, type: 'paid' | 'unpaid' | 'reject') => {
    setSelectedReq(req);
    setActionType(type);
    setComment('');
  };

  const closeActionModal = () => {
    setSelectedReq(null);
    setActionType(null);
    setComment('');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !actionType) return;

    setSubmitting(true);
    try {
      let res;
      if (actionType === 'paid') {
        res = await approveRegionalPaid(selectedReq.id, comment.trim());
      } else if (actionType === 'unpaid') {
        res = await approveRegionalUnpaid(selectedReq.id, comment.trim());
      } else {
        res = await rejectRegionalHolidayAction(selectedReq.id, comment.trim());
      }

      if (res.success && res.data) {
        showToast('success', res.message || 'Request reviewed successfully.');
        setRequests((prev) =>
          prev.map((r) => (r.id === selectedReq.id ? res.data! : r))
        );
        closeActionModal();
      } else {
        showToast('error', res.error || 'Failed to process review.');
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate || !holidayReason.trim()) {
      showToast('error', 'All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitRegionalHoliday({
        holidayName: holidayName.trim(),
        date: holidayDate,
        reason: holidayReason.trim(),
      });

      if (res.success && res.data) {
        showToast('success', res.message || 'Regional holiday requested.');
        setRequests((prev) => [res.data!, ...prev]);
        setShowCreateModal(false);
        setHolidayName('');
        setHolidayDate('');
        setHolidayReason('');
      } else {
        showToast('error', res.error || 'Failed to submit request.');
      }
    } catch {
      showToast('error', 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const paidCount = requests.filter((r) => r.status === 'APPROVED_PAID').length;
  const unpaidCount = requests.filter((r) => r.status === 'APPROVED_UNPAID').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const filteredRequests = requests.filter((r) => {
    const matchesFilter = filter === 'ALL' || r.status === filter;
    const matchesSearch =
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.holidayName.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase());
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
          <h1 className="page-title">Regional / Religious Holidays</h1>
          <p className="page-subtitle">
            Manage regional cultural and religious holiday requests with paid or unpaid approval
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => setFilter('PENDING')}
          className={`stat-card cursor-pointer transition-all ${
            filter === 'PENDING' ? 'border-[#ec1c24] ring-1 ring-[#ec1c24]/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Pending</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <span className="stat-value text-amber-600">{pendingCount}</span>
        </div>

        <div
          onClick={() => setFilter('APPROVED_PAID')}
          className={`stat-card cursor-pointer transition-all ${
            filter === 'APPROVED_PAID' ? 'border-[#ec1c24] ring-1 ring-[#ec1c24]/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Approved (Paid)</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <span className="stat-value text-green-600">{paidCount}</span>
        </div>

        <div
          onClick={() => setFilter('APPROVED_UNPAID')}
          className={`stat-card cursor-pointer transition-all ${
            filter === 'APPROVED_UNPAID' ? 'border-[#ec1c24] ring-1 ring-[#ec1c24]/20' : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Approved (Unpaid)</span>
            <Award className="w-5 h-5 text-blue-500" />
          </div>
          <span className="stat-value text-blue-600">{unpaidCount}</span>
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

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {(['PENDING', 'APPROVED_PAID', 'APPROVED_UNPAID', 'REJECTED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
            >
              {s === 'ALL'
                ? 'All'
                : s === 'APPROVED_PAID'
                ? 'Paid'
                : s === 'APPROVED_UNPAID'
                ? 'Unpaid'
                : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search holiday, employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm w-full"
          />
        </div>
      </div>

      {/* Table */}
      {filteredRequests.length === 0 ? (
        <div className="card empty-state py-12">
          <Globe className="w-12 h-12 empty-state-icon mx-auto" />
          <p className="mt-2 text-base font-medium text-gray-700">No regional holiday requests</p>
          <p className="text-xs text-gray-400">No records found for current filter.</p>
        </div>
      ) : (
        <div className="table-container shadow-sm">
          <table className="table table-wide">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Requested On</th>
                <th>Reviewer</th>
                <th>Reviewer Notes</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="font-semibold text-gray-900">{req.employeeName}</td>
                  <td className="font-medium text-gray-900">{req.holidayName}</td>
                  <td className="whitespace-nowrap text-sm text-gray-700">{formatDate(req.date)}</td>
                  <td className="max-w-[220px]">
                    <p className="truncate text-sm text-gray-700" title={req.reason}>
                      {req.reason}
                    </p>
                  </td>
                  <td><StatusBadge status={req.status} /></td>
                  <td className="whitespace-nowrap text-xs text-gray-500">{formatDate(req.requestedAt)}</td>
                  <td className="text-xs text-gray-600">{req.reviewedBy || '—'}</td>
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
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          onClick={() => openActionModal(req, 'paid')}
                          className="btn btn-sm btn-success text-xs"
                          title="Approve as Paid Holiday"
                        >
                          Paid
                        </button>
                        <button
                          onClick={() => openActionModal(req, 'unpaid')}
                          className="btn btn-sm btn-secondary text-xs"
                          title="Approve as Unpaid Holiday"
                        >
                          Unpaid
                        </button>
                        <button
                          onClick={() => openActionModal(req, 'reject')}
                          className="btn btn-sm btn-danger text-xs"
                          title="Reject Request"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {req.reviewedBy ? `Reviewed by ${req.reviewedBy}` : 'Completed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selectedReq && actionType && (
        <div className="modal-overlay" onClick={closeActionModal}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {actionType === 'paid' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : actionType === 'unpaid' ? (
                  <Award className="w-6 h-6 text-blue-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {actionType === 'paid'
                    ? 'Approve as Paid Holiday'
                    : actionType === 'unpaid'
                    ? 'Approve as Unpaid Holiday'
                    : 'Reject Regional Holiday'}
                </h3>
              </div>
              <button onClick={closeActionModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3.5 mb-4 text-sm space-y-1.5 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Employee:</span>
                <span className="font-semibold text-gray-900">{selectedReq.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Holiday:</span>
                <span className="font-medium text-gray-900">{selectedReq.holidayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="font-medium text-gray-900">{formatDate(selectedReq.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reason:</span>
                <span className="text-gray-700 italic max-w-[280px] text-right truncate">"{selectedReq.reason}"</span>
              </div>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  Reviewer Comment (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add feedback or remarks..."
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
                  className={`btn ${
                    actionType === 'paid'
                      ? 'btn-success'
                      : actionType === 'unpaid'
                      ? 'btn-primary'
                      : 'btn-danger'
                  }`}
                  disabled={submitting}
                >
                  {submitting ? <span className="spinner" /> : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Request Regional / Religious Holiday</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="label">Holiday Name</label>
                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder="e.g., Onam, Pongal, Eid"
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="input"
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="label">Reason</label>
                <textarea
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  placeholder="Describe the occasion..."
                  className="textarea"
                  rows={3}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Submit Request'}
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
